class UserProfile {
  const UserProfile({
    required this.userId,
    required this.username,
    required this.employeeName,
    required this.phone,
    required this.currentAddress,
    this.degree,
    this.position,
    this.departmentCode,
    this.role,
    this.isKhoa,
  });

  final int userId;
  final String username;
  final String employeeName;
  final String phone;
  final String currentAddress;
  final String? degree;
  final String? position;
  final String? departmentCode;
  final String? role;
  final int? isKhoa;

  factory UserProfile.fromJson(Map<String, dynamic> json) => UserProfile(
    userId: _int(json['id_User'] ?? json['userId']) ?? 0,
    username: _string(json['username'] ?? json['TenDangNhap']) ?? '',
    employeeName: _string(json['employeeName'] ?? json['TenNhanVien']) ?? '',
    phone: _string(json['phone'] ?? json['DienThoai']) ?? '',
    currentAddress:
        _string(json['currentAddress'] ?? json['DiaChiHienNay']) ?? '',
    degree: _string(json['degree'] ?? json['HocVi']),
    position: _string(json['position'] ?? json['ChucVu']),
    departmentCode: _string(json['departmentCode'] ?? json['MaPhongBan']),
    role: _string(json['role'] ?? json['Quyen']),
    isKhoa: _int(json['isKhoa']),
  );

  UserProfile copyWith({String? phone, String? currentAddress}) => UserProfile(
    userId: userId,
    username: username,
    employeeName: employeeName,
    phone: phone ?? this.phone,
    currentAddress: currentAddress ?? this.currentAddress,
    degree: degree,
    position: position,
    departmentCode: departmentCode,
    role: role,
    isKhoa: isKhoa,
  );
}

String? _string(dynamic value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}

int? _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}
