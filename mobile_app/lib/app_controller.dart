import 'package:flutter/foundation.dart';

import 'models/account.dart';
import 'models/auth_session.dart';
import 'models/notification.dart';
import 'models/statistics.dart';
import 'models/unit_statistics.dart';
import 'services/api_client.dart';
import 'services/auth_repository.dart';
import 'services/statistics_repository.dart';
import 'services/token_store.dart';
import 'services/notification_repository.dart';

enum AppStatus { initializing, signedOut, ready, loading, error }

class AppController extends ChangeNotifier {
  AppController({
    required this.authRepository,
    required this.statisticsRepository,
    required this.tokenStore,
    required this.notificationRepository,
  });

  final AuthRepository authRepository;
  final StatisticsRepository statisticsRepository;
  final TokenStore tokenStore;
  final NotificationRepository notificationRepository;

  AppStatus status = AppStatus.initializing;
  AuthSession? session;
  PersonalDashboard? dashboard;
  List<AcademicYear> academicYears = const [];
  String selectedYear = '';
  String selectedScope = 'projected';
  String unitSelectedYear = '';
  String unitSelectedScope = 'projected';
  List<UnitOption> unitOptions = const [];
  String selectedUnitId = 'ALL';
  UnitDashboard? unitDashboard;
  bool unitLoading = false;
  String? unitErrorMessage;
  List<AppNotification> notifications = const [];
  bool notificationLoading = false;
  String? notificationErrorMessage;
  String? errorMessage;
  UserProfile? profile;
  bool profileLoading = false;
  bool profileSaving = false;
  String? profileErrorMessage;

  bool get isSignedIn => session != null;

  Future<void> initialize() async {
    try {
      session = await tokenStore.read();
      if (session == null) {
        status = AppStatus.signedOut;
        notifyListeners();
        return;
      }
      status = AppStatus.ready;
      notifyListeners();
      await loadFilters();
      if (selectedYear.isNotEmpty) await loadDashboard();
    } catch (error) {
      await _handleError(error);
      notifyListeners();
    }
  }

  Future<void> login(String username, String password) async {
    status = AppStatus.loading;
    errorMessage = null;
    notifyListeners();
    try {
      session = await authRepository.login(
        username: username,
        password: password,
      );
      status = AppStatus.ready;
      notifyListeners();
      await loadFilters();
      if (selectedYear.isNotEmpty) await loadDashboard();
    } catch (error) {
      await _handleError(error);
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await authRepository.logout();
    session = null;
    dashboard = null;
    academicYears = const [];
    selectedYear = '';
    unitSelectedYear = '';
    unitSelectedScope = 'projected';
    unitOptions = const [];
    selectedUnitId = 'ALL';
    unitDashboard = null;
    unitErrorMessage = null;
    profile = null;
    profileErrorMessage = null;
    profileLoading = false;
    profileSaving = false;
    notifications = const [];
    notificationErrorMessage = null;
    status = AppStatus.signedOut;
    notifyListeners();
  }

  Future<void> loadFilters() async {
    try {
      final years = await statisticsRepository.getAcademicYears();
      academicYears = years;
      if (selectedYear.isEmpty && years.isNotEmpty) {
        selectedYear = years.first.value;
      }
      if (unitSelectedYear.isEmpty && years.isNotEmpty) {
        unitSelectedYear = years.first.value;
      }
      notifyListeners();
    } catch (error) {
      await _handleError(error, preserveStatus: true);
      notifyListeners();
    }
  }

  Future<void> loadDashboard() async {
    final current = session;
    if (current == null || selectedYear.isEmpty) return;
    status = AppStatus.loading;
    errorMessage = null;
    notifyListeners();
    try {
      dashboard = await statisticsRepository.getPersonalDashboard(
        session: current,
        academicYear: selectedYear,
        scope: selectedScope,
      );
      status = AppStatus.ready;
      notifyListeners();
    } catch (error) {
      await _handleError(error);
      notifyListeners();
    }
  }

  Future<void> loadUnitFilters() async {
    try {
      unitOptions = await statisticsRepository.getUnitOptions();
      if (selectedUnitId != 'ALL' &&
          !unitOptions.any((unit) => unit.id == selectedUnitId)) {
        selectedUnitId = 'ALL';
      }
      notifyListeners();
    } catch (error) {
      unitErrorMessage = _message(error);
      notifyListeners();
    }
  }

  Future<void> loadUnitDashboard() async {
    if (session == null || unitSelectedYear.isEmpty) return;
    unitLoading = true;
    unitErrorMessage = null;
    notifyListeners();
    try {
      UnitOption? selectedUnit;
      for (final unit in unitOptions) {
        if (unit.id == selectedUnitId) {
          selectedUnit = unit;
          break;
        }
      }
      unitDashboard = await statisticsRepository.getUnitDashboard(
        academicYear: unitSelectedYear,
        unitId: selectedUnitId,
        unitCode: selectedUnit?.code ?? 'ALL',
        scope: unitSelectedScope,
      );
    } catch (error) {
      unitErrorMessage = _message(error);
    } finally {
      unitLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadNotifications() async {
    notificationLoading = true;
    notificationErrorMessage = null;
    notifyListeners();
    try {
      notifications = await notificationRepository.getNotifications(
        department: session?.departmentCode,
      );
    } catch (error) {
      notificationErrorMessage = _message(error);
    } finally {
      notificationLoading = false;
      notifyListeners();
    }
  }

  Future<void> loadProfile() async {
    if (session == null || profileLoading) return;
    profileLoading = true;
    profileErrorMessage = null;
    notifyListeners();
    try {
      profile = await authRepository.getProfile();
    } catch (error) {
      profileErrorMessage = _message(error);
      if (error is ApiException && error.statusCode == 401) {
        await _handleError(error);
      }
    } finally {
      profileLoading = false;
      notifyListeners();
    }
  }

  Future<bool> updateContact({
    required String phone,
    required String currentAddress,
  }) async {
    profileSaving = true;
    profileErrorMessage = null;
    notifyListeners();
    try {
      profile = await authRepository.updateContact(
        phone: phone,
        currentAddress: currentAddress,
      );
      return true;
    } catch (error) {
      profileErrorMessage = _message(error);
      if (error is ApiException && error.statusCode == 401) {
        await _handleError(error);
      }
      return false;
    } finally {
      profileSaving = false;
      notifyListeners();
    }
  }

  Future<bool> changePassword({
    required String currentPassword,
    required String newPassword,
  }) async {
    final currentSession = session;
    if (currentSession == null) return false;
    profileSaving = true;
    profileErrorMessage = null;
    notifyListeners();
    try {
      session = await authRepository.changePassword(
        session: currentSession,
        currentPassword: currentPassword,
        newPassword: newPassword,
      );
      return true;
    } catch (error) {
      profileErrorMessage = _message(error);
      if (error is ApiException && error.statusCode == 401) {
        await _handleError(error);
      }
      return false;
    } finally {
      profileSaving = false;
      notifyListeners();
    }
  }

  Future<void> changeUnit(String unitId) async {
    selectedUnitId = unitId;
    await loadUnitDashboard();
  }

  Future<void> changeUnitYear(String year) async {
    unitSelectedYear = year;
    unitDashboard = null;
    await loadUnitDashboard();
  }

  Future<void> changeUnitScope(String scope) async {
    unitSelectedScope = scope;
    unitDashboard = null;
    await loadUnitDashboard();
  }

  Future<void> changeUnitFilters({
    required String year,
    required String scope,
    required String unitId,
  }) async {
    if (unitSelectedYear == year &&
        unitSelectedScope == scope &&
        selectedUnitId == unitId) {
      return;
    }
    unitSelectedYear = year;
    unitSelectedScope = scope;
    selectedUnitId = unitId;
    unitDashboard = null;
    await loadUnitDashboard();
  }

  Future<void> changeYear(String year) async {
    await changePersonalFilters(year: year, scope: selectedScope);
  }

  Future<void> changeScope(String scope) async {
    await changePersonalFilters(year: selectedYear, scope: scope);
  }

  Future<void> changePersonalFilters({
    required String year,
    required String scope,
  }) async {
    if (selectedYear == year && selectedScope == scope) return;
    selectedYear = year;
    selectedScope = scope;
    // Never keep showing the previous scope while the new scope is loading
    // or when its business precondition fails (for example official before
    // the academic year is locked).
    dashboard = null;
    await loadDashboard();
  }

  static String _message(Object error) {
    if (error is ApiException) return error.message;
    return 'Có lỗi xảy ra. Vui lòng thử lại.';
  }

  Future<void> _handleError(Object error, {bool preserveStatus = false}) async {
    errorMessage = _message(error);
    if (error is ApiException && error.statusCode == 401) {
      await tokenStore.clear();
      session = null;
      dashboard = null;
      unitDashboard = null;
      status = AppStatus.signedOut;
      return;
    }
    if (!preserveStatus) status = AppStatus.error;
  }
}
