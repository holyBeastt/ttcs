class AppNotification {
  const AppNotification({
    this.id,
    required this.title,
    required this.body,
    this.department,
    this.createdAt,
    this.link,
  });

  final int? id;
  final String title;
  final String body;
  final String? department;
  final DateTime? createdAt;
  final String? link;

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: _int(json['id'] ?? json['Id'] ?? json['ID']),
      title:
          _text(json['TieuDe'] ?? json['tieuDe'] ?? json['title']) ??
          'Thông báo',
      body: _text(json['NoiDung'] ?? json['noiDung'] ?? json['content']) ?? '',
      department: _text(
        json['MaPhongBan'] ?? json['maPhongBan'] ?? json['department'],
      ),
      createdAt: DateTime.tryParse(
        (json['ThoiGian'] ??
                    json['thoiGian'] ??
                    json['createdAt'] ??
                    json['created_at'])
                ?.toString() ??
            '',
      ),
      link: _text(json['url'] ?? json['link'] ?? json['Url']),
    );
  }
}

String? _text(dynamic value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}

int? _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}
