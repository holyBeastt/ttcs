import '../models/notification.dart';
import 'api_client.dart';

class NotificationRepository {
  const NotificationRepository(this.client);

  final ApiClient client;

  Future<List<AppNotification>> getNotifications({String? department}) async {
    final path = department == null || department.trim().isEmpty
        ? '/getMessage'
        : '/getMessage/${Uri.encodeComponent(department)}';
    final response = await client.get(path);
    final body = _map(response.data);
    final raw = body['Message'] ?? body['message'] ?? body['data'];
    if (raw is! List) return const [];
    return raw
        .whereType<Map>()
        .map(
          (item) => AppNotification.fromJson(Map<String, dynamic>.from(item)),
        )
        .toList(growable: false);
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }
}
