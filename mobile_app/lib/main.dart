import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'app_controller.dart';
import 'config/app_config.dart';
import 'models/account.dart';
import 'models/auth_session.dart';
import 'models/notification.dart';
import 'models/statistics.dart';
import 'models/unit_statistics.dart';
import 'personal_detail_pages.dart';
import 'services/api_client.dart';
import 'services/auth_repository.dart';
import 'services/statistics_repository.dart';
import 'services/token_store.dart';
import 'services/notification_repository.dart';

const _brandColor = Color(0xff315be9);
const _canvasColor = Color(0xfff6f8fc);
const _inkColor = Color(0xff172033);
const _mutedColor = Color(0xff6f7b91);
const _lineColor = Color(0xffe5eaf2);

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final tokenStore = TokenStore();
  final apiClient = ApiClient(
    baseUrl: AppConfig.apiBaseUrl,
    tokenStore: tokenStore,
  );
  final controller = AppController(
    authRepository: AuthRepository(apiClient),
    statisticsRepository: StatisticsRepository(apiClient),
    tokenStore: tokenStore,
    notificationRepository: NotificationRepository(apiClient),
  );
  runApp(TtcsMobileApp(controller: controller));
  // Request portrait after the engine is attached so startup is not blocked
  // if the device's system UI is still completing a rotation transition.
  SystemChrome.setPreferredOrientations([DeviceOrientation.portraitUp]);
  controller.initialize();
}

class TtcsMobileApp extends StatelessWidget {
  const TtcsMobileApp({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: controller,
      builder: (context, _) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'TTCS Mobile',
        theme: ThemeData(
          useMaterial3: true,
          colorScheme:
              ColorScheme.fromSeed(
                seedColor: _brandColor,
                brightness: Brightness.light,
              ).copyWith(
                primary: _brandColor,
                onPrimary: Colors.white,
                surface: _canvasColor,
                outline: _lineColor,
              ),
          scaffoldBackgroundColor: _canvasColor,
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.transparent,
            surfaceTintColor: Colors.transparent,
            elevation: 0,
            toolbarHeight: 64,
            titleSpacing: 20,
            titleTextStyle: TextStyle(
              color: _inkColor,
              fontSize: 21,
              fontWeight: FontWeight.w800,
            ),
            iconTheme: IconThemeData(color: _inkColor),
          ),
          cardTheme: CardThemeData(
            margin: EdgeInsets.zero,
            color: Colors.white,
            elevation: 0,
            surfaceTintColor: Colors.transparent,
            clipBehavior: Clip.antiAlias,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.all(Radius.circular(20)),
              side: BorderSide(color: _lineColor),
            ),
          ),
          dividerTheme: const DividerThemeData(
            color: _lineColor,
            space: 1,
            thickness: 1,
          ),
          textTheme: ThemeData.light().textTheme
              .apply(bodyColor: _inkColor, displayColor: _inkColor)
              .copyWith(
                titleLarge: const TextStyle(
                  color: _inkColor,
                  fontSize: 20,
                  fontWeight: FontWeight.w800,
                ),
                titleMedium: const TextStyle(
                  color: _inkColor,
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
                bodySmall: const TextStyle(color: _mutedColor, fontSize: 12),
                labelLarge: const TextStyle(
                  color: _inkColor,
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          outlinedButtonTheme: OutlinedButtonThemeData(
            style: OutlinedButton.styleFrom(
              minimumSize: const Size.fromHeight(48),
              side: const BorderSide(color: _lineColor),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
              textStyle: const TextStyle(fontWeight: FontWeight.w700),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: Colors.white,
            labelStyle: const TextStyle(color: _mutedColor, fontSize: 14),
            floatingLabelStyle: const TextStyle(
              color: _brandColor,
              fontWeight: FontWeight.w700,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide.none,
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: _lineColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(14),
              borderSide: BorderSide(color: _brandColor, width: 1.4),
            ),
            contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 13),
          ),
          navigationBarTheme: const NavigationBarThemeData(
            height: 72,
            elevation: 0,
            backgroundColor: Colors.white,
            indicatorColor: Color(0xffdce4ff),
          ),
        ),
        home: _homeFor(controller),
      ),
    );
  }

  Widget _homeFor(AppController controller) {
    if (controller.status == AppStatus.initializing) return const SplashPage();
    if (!controller.isSignedIn) return LoginPage(controller: controller);
    return AppShell(controller: controller);
  }
}

class AppShell extends StatefulWidget {
  const AppShell({super.key, required this.controller});

  final AppController controller;

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int index = 0;

  bool get canViewUnit {
    final session = widget.controller.session;
    final role = (session?.role ?? '').toLowerCase();
    return session?.isKhoa == 1 ||
        role == 'admin' ||
        role == 'lanh_dao_phong' ||
        role == 'tro_ly_phong' ||
        role == 'lãnh đạo phòng' ||
        role == 'trợ lý';
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      DashboardPage(controller: widget.controller),
      if (canViewUnit) UnitStatisticsPage(controller: widget.controller),
      NotificationsPage(controller: widget.controller),
      AccountPage(controller: widget.controller),
    ];
    final labels = <NavigationDestination>[
      const NavigationDestination(
        icon: Icon(Icons.person_outline),
        selectedIcon: Icon(Icons.person),
        label: 'Cá nhân',
      ),
      if (canViewUnit)
        const NavigationDestination(
          icon: Icon(Icons.apartment_outlined),
          selectedIcon: Icon(Icons.apartment),
          label: 'Đơn vị',
        ),
      const NavigationDestination(
        icon: Icon(Icons.notifications_none),
        selectedIcon: Icon(Icons.notifications),
        label: 'Thông báo',
      ),
      const NavigationDestination(
        icon: Icon(Icons.manage_accounts_outlined),
        selectedIcon: Icon(Icons.manage_accounts),
        label: 'Tài khoản',
      ),
    ];
    final safeIndex = index < pages.length ? index : 0;
    return Scaffold(
      body: IndexedStack(index: safeIndex, children: pages),
      bottomNavigationBar: NavigationBar(
        selectedIndex: safeIndex,
        destinations: labels,
        onDestinationSelected: (value) {
          setState(() => index = value);
          if (canViewUnit && value == 1) {
            if (widget.controller.unitOptions.isEmpty) {
              widget.controller.loadUnitFilters().then((_) {
                widget.controller.loadUnitDashboard();
              });
            } else {
              widget.controller.loadUnitDashboard();
            }
          }
          if ((!canViewUnit && value == 1) || (canViewUnit && value == 2)) {
            widget.controller.loadNotifications();
          }
          if (value == pages.length - 1) {
            widget.controller.loadProfile();
          }
        },
      ),
    );
  }
}

class SplashPage extends StatelessWidget {
  const SplashPage({super.key});

  @override
  Widget build(BuildContext context) => Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0xffdce4ff),
              borderRadius: BorderRadius.circular(20),
            ),
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Icon(Icons.insights_rounded, size: 34, color: _brandColor),
            ),
          ),
          const SizedBox(height: 14),
          const Text(
            'TTCS Mobile',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
          ),
          const SizedBox(height: 16),
          const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.5),
          ),
        ],
      ),
    ),
  );
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.controller});

  final AppController controller;

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _usernameController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void dispose() {
    _usernameController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    await widget.controller.login(
      _usernameController.text.trim(),
      _passwordController.text,
    );
  }

  @override
  Widget build(BuildContext context) {
    final loading = widget.controller.status == AppStatus.loading;
    return Scaffold(
      body: DecoratedBox(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xffe9efff), Color(0xfff8f9fc)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 440),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(26, 30, 26, 26),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          Align(
                            alignment: Alignment.center,
                            child: DecoratedBox(
                              decoration: BoxDecoration(
                                color: const Color(0xffdce4ff),
                                borderRadius: BorderRadius.circular(18),
                              ),
                              child: const Padding(
                                padding: EdgeInsets.all(14),
                                child: Icon(
                                  Icons.insights_rounded,
                                  size: 32,
                                  color: Color(0xff315be9),
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(height: 18),
                          Text(
                            'TTCS Mobile',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(fontWeight: FontWeight.w800),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Thống kê Vượt Giờ và NCKH',
                            textAlign: TextAlign.center,
                            style: Theme.of(context).textTheme.bodyMedium
                                ?.copyWith(color: const Color(0xff647084)),
                          ),
                          const SizedBox(height: 26),
                          TextFormField(
                            controller: _usernameController,
                            enabled: !loading,
                            decoration: const InputDecoration(
                              labelText: 'Tên đăng nhập',
                              prefixIcon: Icon(Icons.person_outline),
                            ),
                            validator: (value) =>
                                value == null || value.trim().isEmpty
                                ? 'Nhập tên đăng nhập'
                                : null,
                          ),
                          const SizedBox(height: 14),
                          TextFormField(
                            controller: _passwordController,
                            enabled: !loading,
                            obscureText: true,
                            decoration: const InputDecoration(
                              labelText: 'Mật khẩu',
                              prefixIcon: Icon(Icons.lock_outline),
                            ),
                            validator: (value) => value == null || value.isEmpty
                                ? 'Nhập mật khẩu'
                                : null,
                            onFieldSubmitted: (_) => _submit(),
                          ),
                          if (widget.controller.errorMessage != null) ...[
                            const SizedBox(height: 14),
                            Text(
                              widget.controller.errorMessage!,
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.error,
                              ),
                            ),
                          ],
                          const SizedBox(height: 20),
                          FilledButton.icon(
                            onPressed: loading ? null : _submit,
                            icon: loading
                                ? const SizedBox(
                                    width: 18,
                                    height: 18,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : const Icon(Icons.login),
                            label: Text(
                              loading ? 'Đang đăng nhập...' : 'Đăng nhập',
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class DashboardPage extends StatelessWidget {
  const DashboardPage({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final dashboard = controller.dashboard;
    final loading = controller.status == AppStatus.loading;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cá nhân'),
        actions: [
          IconButton(
            tooltip: 'Làm mới thống kê',
            onPressed: controller.loadDashboard,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: controller.loadDashboard,
          child: ListView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
            children: [
              _DashboardHeader(session: controller.session!),
              const SizedBox(height: 16),
              _Filters(controller: controller),
              const SizedBox(height: 16),
              if (dashboard != null) ...[
                _DataContextStrip(
                  year: dashboard.academicYear,
                  scope: dashboard.scope,
                  source: dashboard.vuotGioSource,
                  compact: true,
                ),
                const SizedBox(height: 12),
              ],
              if (loading && dashboard == null)
                const Padding(
                  padding: EdgeInsets.all(40),
                  child: Center(child: CircularProgressIndicator()),
                )
              else if (dashboard == null)
                _EmptyState(
                  message: controller.errorMessage ?? 'Chưa có dữ liệu.',
                ),
              if (dashboard != null) ...[
                if (dashboard.warning != null)
                  _WarningBanner(message: dashboard.warning!),
                if (dashboard.isStale)
                  _StaleBanner(cachedAt: dashboard.cachedAt),
                _OverviewHero(
                  summary: dashboard.vuotGio,
                  onTap: () => _openVuotGioDetails(context, controller),
                ),
                const SizedBox(height: 14),
                _KpiGrid(summary: dashboard.vuotGio),
                const SizedBox(height: 14),
                _SectionTitle(
                  title: 'Thống kê NCKH',
                  actionLabel: 'Xem chi tiết',
                  onTap: () => _openNckhDetails(context, controller),
                ),
                const SizedBox(height: 8),
                _NckhCard(
                  summary: dashboard.nckh,
                  onTap: () => _openNckhDetails(context, controller),
                ),
                const SizedBox(height: 14),
                _SourceBreakdown(summary: dashboard.vuotGio),
                _DataUpdatedAt(value: dashboard.vuotGio.updatedAt),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

void _openVuotGioDetails(BuildContext context, AppController controller) {
  final session = controller.session;
  if (session == null || controller.selectedYear.isEmpty) return;
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => PersonalVuotGioDetailsPage(
        repository: controller.statisticsRepository,
        session: session,
        academicYear: controller.selectedYear,
        scope: controller.selectedScope,
      ),
    ),
  );
}

void _openNckhDetails(BuildContext context, AppController controller) {
  final session = controller.session;
  if (session == null || controller.selectedYear.isEmpty) return;
  Navigator.of(context).push(
    MaterialPageRoute(
      builder: (_) => PersonalNckhDetailsPage(
        repository: controller.statisticsRepository,
        session: session,
        academicYear: controller.selectedYear,
        scope: controller.selectedScope,
      ),
    ),
  );
}

class UnitStatisticsPage extends StatelessWidget {
  const UnitStatisticsPage({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final dashboard = controller.unitDashboard;
    return Scaffold(
      appBar: AppBar(
        title: const Text('Đơn vị'),
        actions: [
          IconButton(
            tooltip: 'Làm mới thống kê',
            onPressed: controller.loadUnitDashboard,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await controller.loadUnitFilters();
          await controller.loadUnitDashboard();
        },
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
          children: [
            _UnitFilterBar(controller: controller),
            const SizedBox(height: 16),
            if (dashboard != null)
              _DataContextStrip(
                year: dashboard.academicYear,
                scope: dashboard.scope,
                source: dashboard.vuotGioSource,
              ),
            if (dashboard != null) const SizedBox(height: 12),
            if (controller.unitLoading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (controller.unitErrorMessage != null)
              _RetryState(
                message: controller.unitErrorMessage!,
                onRetry: controller.loadUnitDashboard,
              )
            else if (dashboard == null)
              _RetryState(
                message: 'Chưa có dữ liệu thống kê đơn vị.',
                onRetry: controller.loadUnitDashboard,
              )
            else ...[
              if (!dashboard.lockStatus.locked && dashboard.scope == 'official')
                const _WarningBanner(
                  message:
                      'Năm học chưa khóa; Chính thức (Snapshot) chưa khả dụng.',
                ),
              const _SectionTitle(title: 'Vượt Giờ'),
              const SizedBox(height: 8),
              _UnitSummaryCards(summary: dashboard.vuotGio.summary),
              const SizedBox(height: 16),
              const _SectionTitle(title: 'Chi tiết theo khoa/phòng'),
              const SizedBox(height: 8),
              _UnitNckhList(rows: dashboard.nckh),
              if (dashboard.vuotGio.rows.isNotEmpty) ...[
                const SizedBox(height: 16),
                _UnitVuotGioUnitList(rows: dashboard.vuotGio.rows),
              ],
            ],
          ],
        ),
      ),
    );
  }
}

/// Keeps long filter values (for example, "2025 - 2026" and "Chính thức")
/// fully visible inside the compact two-column filter row on small screens.
class _UnitFilterBar extends StatelessWidget {
  const _UnitFilterBar({required this.controller});

  final AppController controller;

  Future<void> _openFilters(BuildContext context) async {
    var year = controller.unitSelectedYear;
    var scope = controller.unitSelectedScope;
    var unitId = controller.selectedUnitId;
    final apply = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, update) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Bộ lọc đơn vị',
                  style: Theme.of(sheetContext).textTheme.titleLarge,
                ),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: year.isEmpty ? null : year,
                  decoration: const InputDecoration(labelText: 'Năm học'),
                  items: controller.academicYears
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.value,
                          child: Text(item.value),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) update(() => year = value);
                  },
                ),
                const SizedBox(height: 16),
                Text(
                  'Phạm vi dữ liệu',
                  style: Theme.of(sheetContext).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                SegmentedButton<String>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(value: 'projected', label: Text('Dự kiến')),
                    ButtonSegment(value: 'official', label: Text('Chính thức')),
                  ],
                  selected: {scope},
                  onSelectionChanged: (values) =>
                      update(() => scope = values.first),
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: unitId,
                  decoration: const InputDecoration(labelText: 'Khoa/phòng'),
                  items: [
                    DropdownMenuItem(
                      value: 'ALL',
                      child: Text(
                        controller.unitOptions.length == 1
                            ? 'Đơn vị của tôi'
                            : 'Tất cả đơn vị',
                      ),
                    ),
                    ...controller.unitOptions.map(
                      (item) => DropdownMenuItem(
                        value: item.id,
                        child: Text(
                          item.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ),
                  ],
                  onChanged: (value) {
                    if (value != null) update(() => unitId = value);
                  },
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: year.isEmpty
                      ? null
                      : () => Navigator.of(sheetContext).pop(true),
                  child: const Text('Áp dụng'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (apply == true) {
      await controller.changeUnitFilters(
        year: year,
        scope: scope,
        unitId: unitId,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final unitName = controller.selectedUnitId == 'ALL'
        ? controller.unitOptions.length == 1
              ? 'Đơn vị của tôi'
              : 'Tất cả đơn vị'
        : controller.unitOptions
                  .where((item) => item.id == controller.selectedUnitId)
                  .map((item) => item.name)
                  .firstOrNull ??
              'Khoa/phòng';
    return Card(
      child: InkWell(
        onTap: () => _openFilters(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Icon(Icons.tune_rounded, color: _brandColor),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bộ lọc thống kê',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${controller.unitSelectedYear.isEmpty ? 'Năm học' : controller.unitSelectedYear} · '
                      '${controller.unitSelectedScope == 'official' ? 'Chính thức' : 'Dự kiến'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                    Text(
                      unitName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.edit_outlined, size: 19, color: _brandColor),
            ],
          ),
        ),
      ),
    );
  }
}

class _DataContextStrip extends StatelessWidget {
  const _DataContextStrip({
    required this.year,
    required this.scope,
    this.source,
    this.compact = false,
  });

  final String year;
  final String scope;
  final String? source;
  final bool compact;

  @override
  Widget build(BuildContext context) {
    final official = scope == 'official';
    final color = official ? const Color(0xff8e63ce) : _brandColor;
    final sourceLabel = official && source == 'snapshot'
        ? 'Snapshot đã khóa'
        : 'Dữ liệu đang cập nhật';
    return DecoratedBox(
      decoration: BoxDecoration(
        color: color.withValues(alpha: .08),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withValues(alpha: .16)),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              official ? Icons.verified_outlined : Icons.sync_rounded,
              size: 18,
              color: color,
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  if (!compact) ...[
                    Text(
                      '$year · ${official ? 'Chính thức' : 'Dự kiến'}',
                      style: const TextStyle(fontWeight: FontWeight.w700),
                    ),
                    const SizedBox(height: 2),
                  ],
                  Text(
                    sourceLabel,
                    style: TextStyle(
                      color: color,
                      fontSize: 12,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UnitSummaryCards extends StatelessWidget {
  const _UnitSummaryCards({required this.summary});

  final UnitVuotGioSummary summary;

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        'Giảng viên',
        '${summary.lecturerCount}',
        Icons.groups_2_outlined,
        const Color(0xff315be9),
        null,
      ),
      (
        'Tổng thực hiện',
        _number(summary.totalCompleted),
        Icons.task_alt_rounded,
        const Color(0xff2c9b70),
        null,
      ),
      (
        'Tổng vượt',
        _number(summary.totalOvertime),
        Icons.trending_up_rounded,
        const Color(0xffe76f51),
        null,
      ),
      (
        'Tiết thanh toán',
        _number(summary.totalPayment),
        Icons.payments_outlined,
        const Color(0xff8e63ce),
        null,
      ),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 280,
        mainAxisExtent: 144,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return _MetricCard(
          label: item.$1,
          value: item.$2,
          icon: item.$3,
          color: item.$4,
          helper: item.$5,
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
    this.helper,
  });

  final String label;
  final String value;
  final IconData icon;
  final Color color;
  final String? helper;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              DecoratedBox(
                decoration: BoxDecoration(
                  color: color.withValues(alpha: .12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(7),
                  child: Icon(icon, size: 18, color: color),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge,
                ),
              ),
            ],
          ),
          const Spacer(),
          FittedBox(
            fit: BoxFit.scaleDown,
            alignment: Alignment.centerLeft,
            child: Text(
              value,
              maxLines: 1,
              style: Theme.of(context).textTheme.headlineSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ),
          if (helper != null && helper != value)
            Text(
              helper!,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.bodySmall,
            ),
        ],
      ),
    ),
  );
}

class _UnitNckhList extends StatelessWidget {
  const _UnitNckhList({required this.rows});

  final List<UnitNckhRow> rows;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'NCKH theo đơn vị',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 8),
            if (rows.isEmpty)
              const _InlineEmpty(message: 'Chưa có dữ liệu NCKH.')
            else
              ...rows.asMap().entries.map(
                (entry) => _UnitAggregateRow(
                  index: entry.key,
                  title:
                      entry.value.unitName ?? entry.value.unitCode ?? 'Đơn vị',
                  subtitle: '${entry.value.workCount} công trình',
                  value: _number(entry.value.totalHours),
                  icon: Icons.science_outlined,
                  color: const Color(0xff8e63ce),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _UnitVuotGioUnitList extends StatelessWidget {
  const _UnitVuotGioUnitList({required this.rows});

  final List<UnitVuotGioRow> rows;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Vượt Giờ theo khoa/phòng',
            style: Theme.of(context).textTheme.titleMedium
                ?.copyWith(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          if (rows.isEmpty)
            const _InlineEmpty(
              message: 'Chưa có dữ liệu Vượt Giờ theo khoa/phòng.',
            )
          else
            ...rows.asMap().entries.map(
              (entry) => _UnitAggregateRow(
                index: entry.key,
                title: entry.value.unitName ?? entry.value.unitCode ?? 'Đơn vị',
                subtitle:
                    '${entry.value.lecturerCount} giảng viên · '
                    'Thực hiện ${_number(entry.value.totalCompleted)}',
                value: 'Vượt ${_number(entry.value.totalOvertime)}',
                helper: '${_number(entry.value.payment)} tiết thanh toán',
                icon: Icons.apartment_outlined,
                color: const Color(0xff315be9),
              ),
            ),
        ],
      ),
    ),
  );
}

class _UnitAggregateRow extends StatelessWidget {
  const _UnitAggregateRow({
    required this.index,
    required this.title,
    required this.subtitle,
    required this.value,
    required this.icon,
    required this.color,
    this.helper,
  });

  final int index;
  final String title;
  final String subtitle;
  final String value;
  final String? helper;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(top: index == 0 ? 2 : 10),
    child: Column(
      children: [
        if (index > 0) const Divider(height: 12),
        Row(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            DecoratedBox(
              decoration: BoxDecoration(
                color: color.withValues(alpha: .11),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Padding(
                padding: const EdgeInsets.all(9),
                child: Icon(icon, size: 19, color: color),
              ),
            ),
            const SizedBox(width: 11),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 3),
                  Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                ],
              ),
            ),
            const SizedBox(width: 8),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerRight,
                  child: Text(
                    value,
                    maxLines: 1,
                    style: const TextStyle(fontWeight: FontWeight.w800),
                  ),
                ),
                if (helper != null)
                  Text(
                    helper!,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
              ],
            ),
          ],
        ),
      ],
    ),
  );
}

class _InlineEmpty extends StatelessWidget {
  const _InlineEmpty({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 18),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Icon(Icons.inbox_outlined, size: 20, color: _mutedColor),
        const SizedBox(width: 8),
        Flexible(child: Text(message, textAlign: TextAlign.center)),
      ],
    ),
  );
}

class NotificationsPage extends StatelessWidget {
  const NotificationsPage({super.key, required this.controller});

  final AppController controller;

  @override
  Widget build(BuildContext context) {
    final loading = controller.notificationLoading;
    final notifications = [...controller.notifications]
      ..sort((a, b) {
        if (a.createdAt == null) return b.createdAt == null ? 0 : 1;
        if (b.createdAt == null) return -1;
        return b.createdAt!.compareTo(a.createdAt!);
      });
    final grouped = <Widget>[];
    String? lastDay;
    for (final item in notifications) {
      final day = _notificationDay(item.createdAt);
      if (day != lastDay) {
        grouped.add(
          Padding(
            padding: const EdgeInsets.fromLTRB(2, 14, 2, 10),
            child: Text(day, style: Theme.of(context).textTheme.titleMedium),
          ),
        );
        lastDay = day;
      }
      grouped.add(_NotificationTile(item: item));
    }
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông báo'),
        actions: [
          IconButton(
            tooltip: 'Làm mới thông báo',
            onPressed: controller.loadNotifications,
            icon: const Icon(Icons.refresh_rounded),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: controller.loadNotifications,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
          children: [
            if (loading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (controller.notificationErrorMessage != null)
              _RetryState(
                message: controller.notificationErrorMessage!,
                onRetry: controller.loadNotifications,
              )
            else if (controller.notifications.isEmpty)
              const _NotificationEmpty(),
            if (!loading && controller.notificationErrorMessage == null)
              ...grouped,
          ],
        ),
      ),
    );
  }
}

String _notificationDay(DateTime? value) {
  if (value == null) return 'Khác';
  final day = value.toLocal();
  final today = DateTime.now();
  final date = DateTime(day.year, day.month, day.day);
  final current = DateTime(today.year, today.month, today.day);
  if (date == current) return 'Hôm nay';
  if (date == current.subtract(const Duration(days: 1))) return 'Hôm qua';
  return '${day.day.toString().padLeft(2, '0')}/${day.month.toString().padLeft(2, '0')}/${day.year}';
}

class _NotificationTile extends StatelessWidget {
  const _NotificationTile({required this.item});

  final AppNotification item;

  @override
  Widget build(BuildContext context) => Card(
    margin: const EdgeInsets.only(bottom: 10),
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(
            radius: 20,
            backgroundColor: Color(0xffe9eeff),
            child: Icon(Icons.notifications_none_rounded, color: _brandColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                if (item.body.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Text(item.body),
                ],
                if (item.createdAt != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    _formatDateTime(item.createdAt!),
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _NotificationEmpty extends StatelessWidget {
  const _NotificationEmpty();

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 28),
      child: Column(
        children: [
          const CircleAvatar(
            radius: 30,
            backgroundColor: Color(0xffe9eeff),
            child: Icon(
              Icons.notifications_none_rounded,
              size: 30,
              color: _brandColor,
            ),
          ),
          const SizedBox(height: 14),
          Text(
            'Chưa có thông báo',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 5),
          Text(
            'Các cập nhật mới sẽ xuất hiện tại đây. Kéo xuống để làm mới.',
            style: Theme.of(context).textTheme.bodySmall,
            textAlign: TextAlign.center,
          ),
        ],
      ),
    ),
  );
}

class AccountPage extends StatefulWidget {
  const AccountPage({super.key, required this.controller});

  final AppController controller;

  @override
  State<AccountPage> createState() => _AccountPageState();
}

class _AccountPageState extends State<AccountPage> {
  Future<void> _confirmLogout() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Đăng xuất?'),
        content: const Text('Bạn sẽ cần đăng nhập lại để xem dữ liệu.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(false),
            child: const Text('Ở lại'),
          ),
          TextButton(
            onPressed: () => Navigator.of(dialogContext).pop(true),
            style: TextButton.styleFrom(
              foregroundColor: Theme.of(dialogContext).colorScheme.error,
            ),
            child: const Text('Đăng xuất'),
          ),
        ],
      ),
    );
    if (confirmed == true && mounted) await widget.controller.logout();
  }

  Future<void> _editContact() async {
    final profile = widget.controller.profile;
    if (profile == null) return;
    final updated = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) =>
            EditContactPage(controller: widget.controller, profile: profile),
      ),
    );
    if (updated == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã cập nhật thông tin liên hệ.')),
      );
    }
  }

  Future<void> _changePassword() async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => ChangePasswordPage(controller: widget.controller),
      ),
    );
    if (changed == true && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Đã đổi mật khẩu thành công.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final controller = widget.controller;
    final session = controller.session!;
    final profile = controller.profile;
    final displayName = profile?.employeeName.isNotEmpty == true
        ? profile!.employeeName
        : (session.employeeName ?? session.username);
    final phone = profile?.phone ?? '';
    final address = profile?.currentAddress ?? '';
    return Scaffold(
      appBar: AppBar(title: const Text('Tài khoản')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
        children: [
          _AccountHero(
            displayName: displayName,
            username: session.username,
            department: session.departmentCode,
          ),
          const SizedBox(height: 22),
          if (controller.profileLoading && profile == null)
            const Padding(
              padding: EdgeInsets.all(24),
              child: Center(child: CircularProgressIndicator()),
            )
          else if (controller.profileErrorMessage != null && profile == null)
            _RetryState(
              message: controller.profileErrorMessage!,
              onRetry: controller.loadProfile,
            ),
          const _SectionTitle(title: 'Thông tin cá nhân'),
          const SizedBox(height: 8),
          Card(
            child: Column(
              children: [
                _AccountInfoRow(
                  icon: Icons.badge_outlined,
                  label: 'Vai trò',
                  value: session.role ?? 'Chưa xác định',
                ),
                const Divider(indent: 46, endIndent: 14),
                _AccountInfoRow(
                  icon: Icons.apartment_outlined,
                  label: 'Khoa/phòng',
                  value: session.departmentCode ?? 'Chưa xác định',
                ),
                if (profile != null) ...[
                  const Divider(indent: 46, endIndent: 14),
                  _AccountInfoRow(
                    icon: Icons.phone_outlined,
                    label: 'Số điện thoại',
                    value: phone.isEmpty ? 'Chưa cập nhật' : phone,
                  ),
                  const Divider(indent: 46, endIndent: 14),
                  _AccountInfoRow(
                    icon: Icons.home_outlined,
                    label: 'Địa chỉ liên hệ',
                    value: address.isEmpty ? 'Chưa cập nhật' : address,
                  ),
                  const Divider(indent: 46, endIndent: 14),
                  _AccountActionRow(
                    icon: Icons.edit_outlined,
                    label: 'Chỉnh sửa liên hệ',
                    onTap: controller.profileSaving ? null : _editContact,
                  ),
                ],
              ],
            ),
          ),
          const SizedBox(height: 22),
          const _SectionTitle(title: 'Bảo mật'),
          const SizedBox(height: 8),
          Card(
            child: _AccountActionRow(
              icon: Icons.lock_outline,
              label: 'Đổi mật khẩu',
              onTap: controller.profileSaving ? null : _changePassword,
            ),
          ),
          const SizedBox(height: 22),
          const _SectionTitle(title: 'Phiên đăng nhập'),
          const SizedBox(height: 8),
          Card(
            child: _AccountActionRow(
              icon: Icons.logout_rounded,
              label: 'Đăng xuất',
              onTap: _confirmLogout,
              destructive: true,
            ),
          ),
        ],
      ),
    );
  }
}

class _AccountHero extends StatelessWidget {
  const _AccountHero({
    required this.displayName,
    required this.username,
    required this.department,
  });

  final String displayName;
  final String username;
  final String? department;

  @override
  Widget build(BuildContext context) {
    final initial = displayName.trim().isEmpty
        ? 'T'
        : displayName.trim().substring(0, 1).toUpperCase();
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xff315be9), Color(0xff5d76e8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(22),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 18, 18, 16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 28,
              backgroundColor: Colors.white.withValues(alpha: .2),
              foregroundColor: Colors.white,
              child: Text(
                initial,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    displayName,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 19,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '@$username${department == null ? '' : ' · $department'}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .82),
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.verified_user_outlined, color: Colors.white),
          ],
        ),
      ),
    );
  }
}

class _AccountInfoRow extends StatelessWidget {
  const _AccountInfoRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 9),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 20, color: _brandColor),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: Theme.of(context).textTheme.bodySmall),
              const SizedBox(height: 3),
              Text(value, style: const TextStyle(fontWeight: FontWeight.w700)),
            ],
          ),
        ),
      ],
    ),
  );
}

class _AccountActionRow extends StatelessWidget {
  const _AccountActionRow({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback? onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive
        ? Theme.of(context).colorScheme.error
        : _brandColor;
    return ListTile(
      onTap: onTap,
      leading: Icon(icon, color: color),
      title: Text(
        label,
        style: TextStyle(color: color, fontWeight: FontWeight.w700),
      ),
      trailing: Icon(Icons.chevron_right_rounded, color: color),
      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
    );
  }
}

class EditContactPage extends StatefulWidget {
  const EditContactPage({
    super.key,
    required this.controller,
    required this.profile,
  });

  final AppController controller;
  final UserProfile profile;

  @override
  State<EditContactPage> createState() => _EditContactPageState();
}

class _EditContactPageState extends State<EditContactPage> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _phoneController;
  late final TextEditingController _addressController;

  @override
  void initState() {
    super.initState();
    _phoneController = TextEditingController(text: widget.profile.phone);
    _addressController = TextEditingController(
      text: widget.profile.currentAddress,
    );
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _addressController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final saved = await widget.controller.updateContact(
      phone: _phoneController.text.trim(),
      currentAddress: _addressController.text.trim(),
    );
    if (saved && mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final saving = widget.controller.profileSaving;
    return Scaffold(
      appBar: AppBar(title: const Text('Thông tin liên hệ')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
          children: [
            const _FormIntro(
              icon: Icons.contact_phone_outlined,
              title: 'Thông tin liên hệ',
              message: 'Chỉ cập nhật số điện thoại và địa chỉ. Thông tin nhân sự do phòng quản trị quản lý.',
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: const InputDecoration(
                labelText: 'Số điện thoại',
                prefixIcon: Icon(Icons.phone_outlined),
              ),
              validator: (value) {
                final text = value?.trim() ?? '';
                if (text.length > 30 ||
                    (text.isNotEmpty &&
                        !RegExp(r'^[0-9+()\-\s.]+$').hasMatch(text))) {
                  return 'Số điện thoại không hợp lệ';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _addressController,
              maxLines: 3,
              maxLength: 255,
              decoration: const InputDecoration(
                labelText: 'Địa chỉ liên hệ',
                prefixIcon: Icon(Icons.home_outlined),
                alignLabelWithHint: true,
              ),
              validator: (value) => (value?.trim().length ?? 0) > 255
                  ? 'Địa chỉ không được vượt quá 255 ký tự'
                  : null,
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: saving ? null : _submit,
              icon: saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(saving ? 'Đang lưu...' : 'Lưu thay đổi'),
            ),
            if (widget.controller.profileErrorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                widget.controller.profileErrorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class ChangePasswordPage extends StatefulWidget {
  const ChangePasswordPage({super.key, required this.controller});

  final AppController controller;

  @override
  State<ChangePasswordPage> createState() => _ChangePasswordPageState();
}

class _ChangePasswordPageState extends State<ChangePasswordPage> {
  final _formKey = GlobalKey<FormState>();
  final _currentController = TextEditingController();
  final _newController = TextEditingController();
  final _confirmController = TextEditingController();

  @override
  void dispose() {
    _currentController.dispose();
    _newController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    final changed = await widget.controller.changePassword(
      currentPassword: _currentController.text,
      newPassword: _newController.text,
    );
    if (changed && mounted) Navigator.of(context).pop(true);
  }

  @override
  Widget build(BuildContext context) {
    final saving = widget.controller.profileSaving;
    return Scaffold(
      appBar: AppBar(title: const Text('Đổi mật khẩu')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 28),
          children: [
            const _FormIntro(
              icon: Icons.lock_reset_outlined,
              title: 'Bảo mật tài khoản',
              message: 'Mật khẩu mới cần có từ 8 đến 128 ký tự.',
            ),
            const SizedBox(height: 14),
            TextFormField(
              controller: _currentController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Mật khẩu hiện tại',
                prefixIcon: Icon(Icons.lock_outline),
              ),
              validator: (value) => value == null || value.isEmpty
                  ? 'Nhập mật khẩu hiện tại'
                  : null,
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _newController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Mật khẩu mới',
                helperText: 'Từ 8 đến 128 ký tự',
                prefixIcon: Icon(Icons.password_outlined),
              ),
              validator: (value) {
                final length = value?.length ?? 0;
                if (length < 8 || length > 128) {
                  return 'Mật khẩu mới phải từ 8 đến 128 ký tự';
                }
                return null;
              },
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _confirmController,
              obscureText: true,
              decoration: const InputDecoration(
                labelText: 'Xác nhận mật khẩu mới',
                prefixIcon: Icon(Icons.check_circle_outline),
              ),
              validator: (value) => value != _newController.text
                  ? 'Mật khẩu xác nhận không khớp'
                  : null,
            ),
            const SizedBox(height: 8),
            FilledButton.icon(
              onPressed: saving ? null : _submit,
              icon: saving
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.save_outlined),
              label: Text(saving ? 'Đang cập nhật...' : 'Đổi mật khẩu'),
            ),
            if (widget.controller.profileErrorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                widget.controller.profileErrorMessage!,
                style: TextStyle(color: Theme.of(context).colorScheme.error),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _RetryState extends StatelessWidget {
  const _RetryState({required this.message, required this.onRetry});

  final String message;
  final Future<void> Function() onRetry;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(32),
    child: Column(
      children: [
        const Icon(Icons.error_outline, size: 48),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: onRetry,
          icon: const Icon(Icons.refresh),
          label: const Text('Thử lại'),
        ),
      ],
    ),
  );
}

class _FormIntro extends StatelessWidget {
  const _FormIntro({
    required this.icon,
    required this.title,
    required this.message,
  });

  final IconData icon;
  final String title;
  final String message;

  @override
  Widget build(BuildContext context) => Card(
    color: const Color(0xffeef2ff),
    child: Padding(
      padding: const EdgeInsets.all(14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          DecoratedBox(
            decoration: BoxDecoration(
              color: const Color(0xffdce4ff),
              borderRadius: BorderRadius.circular(11),
            ),
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Icon(icon, color: _brandColor, size: 20),
            ),
          ),
          const SizedBox(width: 11),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 4),
                Text(message, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
        ],
      ),
    ),
  );
}

class _DashboardHeader extends StatelessWidget {
  const _DashboardHeader({required this.session});

  final AuthSession session;

  @override
  Widget build(BuildContext context) {
    final displayName = session.employeeName?.trim().isNotEmpty == true
        ? session.employeeName!
        : session.username;
    final initial = displayName.trim().isEmpty
        ? 'T'
        : displayName.trim().substring(0, 1).toUpperCase();
    return Row(
      children: [
        CircleAvatar(
          radius: 24,
          backgroundColor: const Color(0xffdce4ff),
          foregroundColor: const Color(0xff315be9),
          child: Text(
            initial,
            style: const TextStyle(fontWeight: FontWeight.w800),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Xin chào,',
                style: Theme.of(context).textTheme.bodySmall
                    ?.copyWith(color: const Color(0xff748096)),
              ),
              Text(
                displayName,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: Theme.of(context).textTheme.titleLarge
                    ?.copyWith(fontWeight: FontWeight.w800),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _OverviewHero extends StatelessWidget {
  const _OverviewHero({required this.summary, required this.onTap});

  final VuotGioSummary summary;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    return Card(
      clipBehavior: Clip.antiAlias,
      color: const Color(0xff315be9),
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 18, 16, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Tổng quan Vượt Giờ',
                style: TextStyle(
                  color: Colors.white,
                  fontSize: 17,
                  fontWeight: FontWeight.w700,
                ),
              ),
              const SizedBox(height: 18),
              Text(
                _number(summary.totalOvertime),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 34,
                  height: 1,
                  fontWeight: FontWeight.w800,
                ),
              ),
              const SizedBox(height: 5),
              Text(
                'Tổng số tiết vượt',
                style: TextStyle(
                  color: Colors.white.withValues(alpha: .82),
                  fontSize: 13,
                ),
              ),
              const SizedBox(height: 18),
              Row(
                children: [
                  Expanded(
                    child: _HeroMetric(
                      label: 'Tổng thực hiện',
                      value: _number(summary.totalCompleted),
                    ),
                  ),
                  Expanded(
                    child: _HeroMetric(
                      label: 'Tiết thanh toán',
                      value: _number(summary.payment),
                    ),
                  ),
                  Icon(Icons.arrow_forward_rounded, color: scheme.onPrimary),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _HeroMetric extends StatelessWidget {
  const _HeroMetric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        value,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.w700,
        ),
      ),
      const SizedBox(height: 2),
      Text(
        label,
        style: TextStyle(
          color: Colors.white.withValues(alpha: .76),
          fontSize: 12,
        ),
      ),
    ],
  );
}

class _Filters extends StatelessWidget {
  const _Filters({required this.controller});

  final AppController controller;

  Future<void> _openFilters(BuildContext context) async {
    var year = controller.selectedYear;
    var scope = controller.selectedScope;
    final apply = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, update) => SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Bộ lọc cá nhân',
                  style: Theme.of(sheetContext).textTheme.titleLarge,
                ),
                const SizedBox(height: 20),
                DropdownButtonFormField<String>(
                  isExpanded: true,
                  initialValue: year.isEmpty ? null : year,
                  decoration: const InputDecoration(labelText: 'Năm học'),
                  items: controller.academicYears
                      .map(
                        (item) => DropdownMenuItem(
                          value: item.value,
                          child: Text(item.value),
                        ),
                      )
                      .toList(),
                  onChanged: (value) {
                    if (value != null) update(() => year = value);
                  },
                ),
                const SizedBox(height: 16),
                Text(
                  'Phạm vi dữ liệu',
                  style: Theme.of(sheetContext).textTheme.labelLarge,
                ),
                const SizedBox(height: 8),
                SegmentedButton<String>(
                  showSelectedIcon: false,
                  segments: const [
                    ButtonSegment(value: 'projected', label: Text('Dự kiến')),
                    ButtonSegment(value: 'official', label: Text('Chính thức')),
                  ],
                  selected: {scope},
                  onSelectionChanged: (values) =>
                      update(() => scope = values.first),
                ),
                const SizedBox(height: 20),
                FilledButton(
                  onPressed: year.isEmpty
                      ? null
                      : () => Navigator.of(sheetContext).pop(true),
                  child: const Text('Áp dụng'),
                ),
              ],
            ),
          ),
        ),
      ),
    );
    if (apply == true) {
      await controller.changePersonalFilters(year: year, scope: scope);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      child: InkWell(
        onTap: () => _openFilters(context),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              const Icon(Icons.tune_rounded, color: _brandColor),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bộ lọc thống kê',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    const SizedBox(height: 3),
                    Text(
                      '${controller.selectedYear.isEmpty ? 'Năm học' : controller.selectedYear} · '
                      '${controller.selectedScope == 'official' ? 'Chính thức' : 'Dự kiến'}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              const Icon(Icons.edit_outlined, size: 19, color: _brandColor),
            ],
          ),
        ),
      ),
    );
  }
}

class _KpiGrid extends StatelessWidget {
  const _KpiGrid({required this.summary});

  final VuotGioSummary summary;

  @override
  Widget build(BuildContext context) {
    final items = [
      (
        'Định mức sau miễn giảm',
        summary.adjustedQuota == null ? '—' : _number(summary.adjustedQuota!),
        Icons.rule_outlined,
        Color(0xff2c9b70),
      ),
      (
        'Thiếu NCKH',
        _number(summary.researchShortage),
        Icons.science_outlined,
        Color(0xff8e63ce),
      ),
    ];
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithMaxCrossAxisExtent(
        maxCrossAxisExtent: 280,
        mainAxisExtent: 160,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return Card(
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                DecoratedBox(
                  decoration: BoxDecoration(
                    color: item.$4.withValues(alpha: .12),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(7),
                    child: Icon(item.$3, size: 17, color: item.$4),
                  ),
                ),
                const SizedBox(height: 5),
                FittedBox(
                  fit: BoxFit.scaleDown,
                  alignment: Alignment.centerLeft,
                  child: Text(
                    item.$2,
                    maxLines: 1,
                    style: Theme.of(context).textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.bold),
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  item.$1,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall,
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _NckhCard extends StatelessWidget {
  const _NckhCard({required this.summary, this.onTap});

  final NckhSummary summary;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _Metric(label: 'Công trình', value: '${summary.works}'),
              _Metric(
                label: 'Tổng số tiết',
                value: _number(summary.totalHours),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Metric extends StatelessWidget {
  const _Metric({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      Text(value, style: Theme.of(context).textTheme.headlineSmall),
      const SizedBox(height: 4),
      Text(label),
    ],
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title, this.actionLabel, this.onTap});

  final String title;
  final String? actionLabel;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: Theme.of(context).textTheme.titleLarge
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      if (actionLabel != null)
        TextButton(onPressed: onTap, child: Text(actionLabel!)),
    ],
  );
}

class _WarningBanner extends StatelessWidget {
  const _WarningBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Card(
    color: Theme.of(context).colorScheme.errorContainer,
    child: Padding(padding: const EdgeInsets.all(12), child: Text(message)),
  );
}

class _StaleBanner extends StatelessWidget {
  const _StaleBanner({this.cachedAt});

  final DateTime? cachedAt;

  @override
  Widget build(BuildContext context) {
    final suffix = cachedAt == null ? '' : ' lúc ${_formatDateTime(cachedAt!)}';
    return Card(
      color: Theme.of(context).colorScheme.tertiaryContainer,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            const Icon(Icons.cloud_off_outlined),
            const SizedBox(width: 8),
            Expanded(child: Text('Đang hiển thị dữ liệu lưu lần cuối$suffix.')),
          ],
        ),
      ),
    );
  }
}

class _DataUpdatedAt extends StatelessWidget {
  const _DataUpdatedAt({this.value});

  final DateTime? value;

  @override
  Widget build(BuildContext context) {
    if (value == null) return const SizedBox.shrink();
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Text(
        'Cập nhật: ${_formatDateTime(value!)}',
        style: Theme.of(context).textTheme.bodySmall,
      ),
    );
  }
}

class _SourceBreakdown extends StatelessWidget {
  const _SourceBreakdown({required this.summary});

  final VuotGioSummary summary;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Giảng dạy', summary.teachingHours, Icons.school_outlined),
      ('Ngoài quy chuẩn', summary.outsideStandardHours, Icons.auto_graph),
      ('KTHP', summary.examHours, Icons.fact_check_outlined),
      ('Đồ án', summary.projectHours, Icons.assignment_outlined),
      ('Hội đồng', summary.councilHours, Icons.groups_outlined),
    ];
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Số tiết theo hoạt động',
              style: Theme.of(context).textTheme.titleMedium
                  ?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 4),
            Text(
              'Các hoạt động cộng vào Tổng thực hiện',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            const SizedBox(height: 12),
            ...items.asMap().entries.map(
              (entry) => Padding(
                padding: const EdgeInsets.symmetric(vertical: 7),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(entry.value.$3, size: 18, color: _mutedColor),
                        const SizedBox(width: 9),
                        Expanded(child: Text(entry.value.$1)),
                        Text(
                          _number(entry.value.$2),
                          style: const TextStyle(fontWeight: FontWeight.w700),
                        ),
                      ],
                    ),
                    const SizedBox(height: 7),
                    ClipRRect(
                      borderRadius: BorderRadius.circular(5),
                      child: LinearProgressIndicator(
                        minHeight: 6,
                        value: summary.totalCompleted <= 0
                            ? 0
                            : (entry.value.$2 / summary.totalCompleted).clamp(
                                0.0,
                                1.0,
                              ),
                        backgroundColor: const Color(0xffedf1f7),
                        valueColor: AlwaysStoppedAnimation<Color>(
                          entry.key.isEven
                              ? _brandColor
                              : const Color(0xff7893ee),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const Divider(height: 20),
            Row(
              children: [
                const Icon(
                  Icons.science_outlined,
                  size: 18,
                  color: _mutedColor,
                ),
                const SizedBox(width: 9),
                const Expanded(child: Text('NCKH dùng tính Vượt Giờ')),
                Text(
                  _number(summary.researchHours),
                  style: const TextStyle(fontWeight: FontWeight.w700),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              'Số tiết NCKH không cộng vào Tổng thực hiện.',
              style: Theme.of(context).textTheme.bodySmall,
            ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.all(32),
    child: Column(
      children: [
        const Icon(Icons.inbox_outlined, size: 48),
        const SizedBox(height: 12),
        Text(message, textAlign: TextAlign.center),
      ],
    ),
  );
}

String _number(double value) => value.toStringAsFixed(2);

String _formatDateTime(DateTime value) {
  final local = value.toLocal();
  String two(int value) => value.toString().padLeft(2, '0');
  return '${two(local.day)}/${two(local.month)}/${local.year} '
      '${two(local.hour)}:${two(local.minute)}';
}
