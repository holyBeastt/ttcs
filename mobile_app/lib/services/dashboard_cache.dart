import 'dart:convert';

import 'package:shared_preferences/shared_preferences.dart';

import '../models/statistics.dart';

class DashboardCache {
  const DashboardCache();

  String key({
    required int userId,
    required String year,
    required String scope,
  }) => 'ttcs.mobile.dashboard.$userId.$year.$scope';

  Future<void> save(String cacheKey, PersonalDashboard dashboard) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(cacheKey, jsonEncode(dashboard.toJson()));
  }

  Future<PersonalDashboard?> read(String cacheKey) async {
    final prefs = await SharedPreferences.getInstance();
    final encoded = prefs.getString(cacheKey);
    if (encoded == null) return null;
    try {
      return PersonalDashboard.fromJson(
        Map<String, dynamic>.from(jsonDecode(encoded) as Map),
      );
    } catch (_) {
      await prefs.remove(cacheKey);
      return null;
    }
  }
}
