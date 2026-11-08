import 'api_client.dart';
import '../models/account.dart';
import '../models/auth_session.dart';

class AuthRepository {
  const AuthRepository(this.client);

  final ApiClient client;

  Future<AuthSession> login({
    required String username,
    required String password,
  }) async {
    final response = await client.post(
      '/login',
      data: {'username': username, 'password': password},
    );
    final body = _map(response.data);
    final session = AuthSession.fromJson(body);
    if (session.accessToken.isEmpty || session.userId <= 0) {
      throw const ApiException('Thông tin đăng nhập không hợp lệ.');
    }
    await client.tokenStore.save(session);
    return session;
  }

  Future<void> logout() => client.tokenStore.clear();

  Future<UserProfile> getProfile() async {
    final response = await client.get('/api/mobile/v1/me');
    final body = _map(response.data);
    final data = body['data'];
    if (data is! Map) {
      throw const ApiException('Thông tin tài khoản không hợp lệ.');
    }
    return UserProfile.fromJson(Map<String, dynamic>.from(data));
  }

  Future<UserProfile> updateContact({
    String? phone,
    String? currentAddress,
  }) async {
    final payload = <String, dynamic>{};
    if (phone != null) payload['phone'] = phone;
    if (currentAddress != null) payload['currentAddress'] = currentAddress;
    final response = await client.patch(
      '/api/mobile/v1/me/contact',
      data: payload,
    );
    final body = _map(response.data);
    final data = body['data'];
    if (data is! Map) {
      throw const ApiException('Thông tin cập nhật không hợp lệ.');
    }
    return UserProfile.fromJson(Map<String, dynamic>.from(data));
  }

  Future<AuthSession> changePassword({
    required AuthSession session,
    required String currentPassword,
    required String newPassword,
  }) async {
    final response = await client.post(
      '/api/mobile/v1/me/change-password',
      data: {'currentPassword': currentPassword, 'newPassword': newPassword},
    );
    final body = _map(response.data);
    final accessToken = body['accessToken']?.toString();
    final refreshToken = body['refreshToken']?.toString();
    if (accessToken == null ||
        accessToken.isEmpty ||
        refreshToken == null ||
        refreshToken.isEmpty) {
      throw const ApiException('Không nhận được phiên đăng nhập mới.');
    }
    final updated = session.copyWith(
      accessToken: accessToken,
      refreshToken: refreshToken,
    );
    await client.tokenStore.save(updated);
    return updated;
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }
}
