class AuthSession {
  const AuthSession({
    required this.accessToken,
    required this.refreshToken,
    required this.userId,
    required this.username,
    this.employeeName,
    this.role,
    this.departmentCode,
    this.isKhoa,
  });

  final String accessToken;
  final String refreshToken;
  final int userId;
  final String username;
  final String? employeeName;
  final String? role;
  final String? departmentCode;
  final int? isKhoa;

  factory AuthSession.fromJson(Map<String, dynamic> json) {
    return AuthSession(
      accessToken: json['accessToken'] as String? ?? '',
      refreshToken: json['refreshToken'] as String? ?? '',
      userId: _asInt(json['id_User']) ?? 0,
      username: json['username'] as String? ?? '',
      employeeName: json['TenNhanVien'] as String?,
      role: json['role'] as String?,
      departmentCode: json['MaPhongBan']?.toString(),
      isKhoa: _asInt(json['isKhoa']),
    );
  }

  Map<String, dynamic> toJson() => {
    'accessToken': accessToken,
    'refreshToken': refreshToken,
    'id_User': userId,
    'username': username,
    'TenNhanVien': employeeName,
    'role': role,
    'MaPhongBan': departmentCode,
    'isKhoa': isKhoa,
  };

  AuthSession copyWith({String? accessToken, String? refreshToken}) =>
      AuthSession(
        accessToken: accessToken ?? this.accessToken,
        refreshToken: refreshToken ?? this.refreshToken,
        userId: userId,
        username: username,
        employeeName: employeeName,
        role: role,
        departmentCode: departmentCode,
        isKhoa: isKhoa,
      );
}

int? _asInt(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}
