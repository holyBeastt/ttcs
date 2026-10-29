import 'dart:convert';

import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../models/auth_session.dart';

class TokenStore {
  TokenStore({FlutterSecureStorage? secureStorage})
    : _secureStorage = secureStorage ?? const FlutterSecureStorage();

  static const _key = 'ttcs.mobile.auth.session';
  final FlutterSecureStorage _secureStorage;

  Future<void> save(AuthSession session) async {
    final encoded = jsonEncode(session.toJson());
    try {
      await _secureStorage.write(key: _key, value: encoded);
    } catch (_) {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_key, encoded);
    }
  }

  Future<AuthSession?> read() async {
    String? encoded;
    try {
      encoded = await _secureStorage.read(key: _key);
    } catch (_) {
      // Fall back to preferences on platforms where secure storage is unavailable.
    }
    if (encoded == null) {
      final prefs = await SharedPreferences.getInstance();
      encoded = prefs.getString(_key);
    }
    if (encoded == null || encoded.isEmpty) return null;
    try {
      return AuthSession.fromJson(
        Map<String, dynamic>.from(jsonDecode(encoded) as Map),
      );
    } catch (_) {
      await clear();
      return null;
    }
  }

  Future<void> clear() async {
    try {
      await _secureStorage.delete(key: _key);
    } catch (_) {
      // Ignore secure storage errors and clear the fallback below.
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}
