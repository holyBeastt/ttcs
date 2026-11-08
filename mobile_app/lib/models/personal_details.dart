/// Detail records returned by the personal Vượt Giờ and NCKH endpoints.
///
/// The legacy Vượt Giờ endpoint returns several record shapes. The mobile
/// model keeps a small, display-safe projection of each shape instead of
/// passing the raw response into widgets (which can contain employee PII).
class PersonalVuotGioDetails {
  const PersonalVuotGioDetails({
    this.teacherName,
    this.employee,
    this.teaching = const [],
    this.outsideStandard = const [],
    this.exams = const [],
    this.projects = const [],
    this.fieldTrips = const [],
    this.research = const [],
  });

  final String? teacherName;
  final PersonalEmployeeInfo? employee;
  final List<PersonalActivityRecord> teaching;
  final List<PersonalActivityRecord> outsideStandard;
  final List<PersonalActivityRecord> exams;
  final List<PersonalActivityRecord> projects;
  final List<PersonalActivityRecord> fieldTrips;
  final List<NckhRecord> research;

  factory PersonalVuotGioDetails.fromJson(Map<String, dynamic> json) {
    final nested = _map(json['chi_tiet']);
    final source = nested.isNotEmpty ? nested : json;
    final info = _map(source['thongTinNhanVien']);
    return PersonalVuotGioDetails(
      teacherName: _string(source['giangVien']) ?? _string(info['giangVien']),
      employee: info.isEmpty ? null : PersonalEmployeeInfo.fromJson(info),
      teaching: _activityList(
        source['giangDay'],
        PersonalActivityType.teaching,
      ),
      outsideStandard: _activityList(
        source['lopNgoaiQC'],
        PersonalActivityType.outsideStandard,
      ),
      exams: _activityList(source['kthp'], PersonalActivityType.exam),
      projects: _activityList(source['doAn'], PersonalActivityType.project),
      fieldTrips: _activityList(
        source['huongDanThamQuan'],
        PersonalActivityType.fieldTrip,
      ),
      research: _nckhList(source['nckh']),
    );
  }
}

class PersonalEmployeeInfo {
  const PersonalEmployeeInfo({
    this.id,
    this.name,
    this.departmentCode,
    this.departmentName,
    this.position,
    this.reductionPercent,
  });

  final int? id;
  final String? name;
  final String? departmentCode;
  final String? departmentName;
  final String? position;
  final String? reductionPercent;

  factory PersonalEmployeeInfo.fromJson(Map<String, dynamic> json) =>
      PersonalEmployeeInfo(
        id: _integer(json['id_User'] ?? json['idUser']),
        name: _string(json['giangVien'] ?? json['tenNhanVien']),
        departmentCode: _string(json['maKhoa'] ?? json['MaPhongBan']),
        departmentName: _string(json['khoa'] ?? json['tenKhoa']),
        position: _string(json['chucVu'] ?? json['ChucVu']),
        reductionPercent: _string(json['phanTramMienGiam']),
      );
}

enum PersonalActivityType {
  teaching,
  outsideStandard,
  exam,
  project,
  fieldTrip,
}

class PersonalActivityRecord {
  const PersonalActivityRecord({
    required this.type,
    required this.title,
    this.subtitle,
    this.hours = 0,
    this.fields = const [],
  });

  final PersonalActivityType type;
  final String title;
  final String? subtitle;
  final double hours;
  final List<DetailField> fields;

  factory PersonalActivityRecord.fromJson(
    Map<String, dynamic> json,
    PersonalActivityType type,
  ) {
    final title = switch (type) {
      PersonalActivityType.teaching =>
        _string(json['TenHocPhan'] ?? json['LopHocPhan']) ??
            'Hoạt động giảng dạy',
      PersonalActivityType.outsideStandard =>
        _string(
              json['moTaHoatDong'] ??
                  json['mo_ta_hoat_dong'] ??
                  json['TenHoatDong'],
            ) ??
            'Hoạt động ngoài quy chuẩn',
      PersonalActivityType.exam =>
        _string(json['ten_hoc_phan'] ?? json['tenhocphan']) ?? 'Hoạt động KTHP',
      PersonalActivityType.project =>
        _string(json['TenDeTai'] ?? json['tenDeTai']) ?? 'Đồ án',
      PersonalActivityType.fieldTrip =>
        _string(json['mo_ta_hoat_dong'] ?? json['moTaHoatDong']) ??
            'Hướng dẫn tham quan',
    };
    final subtitle = switch (type) {
      PersonalActivityType.teaching => _join([
        _string(json['MaHocPhan']),
        _string(json['TenLop']),
        _term(json['HocKy'] ?? json['KiHoc']),
      ]),
      PersonalActivityType.outsideStandard => _join([
        _string(json['nam_hoc'] ?? json['namHoc']),
        _term(json['hoc_ky'] ?? json['hocKy']),
      ]),
      PersonalActivityType.exam => _join([
        _string(json['hinh_thuc'] ?? json['hinhthuc']),
        _string(json['ma_hoc_phan'] ?? json['mahocphan']),
        _term(json['hoc_ky'] ?? json['ki']),
      ]),
      PersonalActivityType.project => _join([
        _string(json['MaSV']),
        _string(json['loai_huong_dan']),
      ]),
      PersonalActivityType.fieldTrip => _join([
        _string(json['nganh_hoc']),
        _term(json['hoc_ky']),
      ]),
    };
    final hours = switch (type) {
      PersonalActivityType.teaching => _number(
        json['QuyChuan'] ?? json['soTietCTDT'] ?? json['LenLop'],
      ),
      PersonalActivityType.outsideStandard => _number(
        json['so_tiet_quy_doi'] ?? json['soTietQuyDoi'],
      ),
      PersonalActivityType.exam => _number(
        json['sotietqc'] ?? json['quy_chuan'],
      ),
      PersonalActivityType.project => _number(json['SoTiet'] ?? json['soTiet']),
      PersonalActivityType.fieldTrip => _number(
        json['so_tiet_quy_doi'] ?? json['soTietQuyDoi'],
      ),
    };
    return PersonalActivityRecord(
      type: type,
      title: title,
      subtitle: subtitle,
      hours: hours,
      fields: _fields(type, json),
    );
  }
}

class DetailField {
  const DetailField(this.label, this.value);

  final String label;
  final String value;
}

class NckhRecord {
  const NckhRecord({
    this.id,
    this.type,
    this.typeLabel,
    this.classification,
    this.title,
    this.academicYear,
    this.totalWorkHours = 0,
    this.acceptedAt,
    this.rating,
    this.code,
    this.mainAuthors,
    this.members,
    this.lecturerRole,
    this.lecturerHours = 0,
  });

  final int? id;
  final String? type;
  final String? typeLabel;
  final String? classification;
  final String? title;
  final String? academicYear;
  final double totalWorkHours;
  final DateTime? acceptedAt;
  final String? rating;
  final String? code;
  final String? mainAuthors;
  final String? members;
  final String? lecturerRole;
  final double lecturerHours;

  factory NckhRecord.fromJson(Map<String, dynamic> json) => NckhRecord(
    id: _integer(json['id']),
    type: _string(json['loaiNckh']),
    typeLabel: _string(json['loaiNckhLabel'] ?? json['typeSlug']),
    classification: _string(json['phanLoai']),
    title: _string(json['tenCongTrinh']),
    academicYear: _string(json['namHoc'] ?? json['nam_hoc']),
    totalWorkHours: _number(json['tongSoTietCongTrinh']),
    acceptedAt: _date(json['ngayNghiemThu']),
    rating: _string(json['xepLoai']),
    code: _string(json['maSo']),
    mainAuthors: _string(json['tacGiaChinh']),
    members: _string(json['thanhVien']),
    lecturerRole: _string(json['vaiTroGiangVien']),
    lecturerHours: _number(json['soTietGiangVien']),
  );
}

List<PersonalActivityRecord> _activityList(
  dynamic value,
  PersonalActivityType type,
) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map(
        (item) => PersonalActivityRecord.fromJson(
          Map<String, dynamic>.from(item),
          type,
        ),
      )
      .toList(growable: false);
}

List<NckhRecord> _nckhList(dynamic value) {
  if (value is! List) return const [];
  return value
      .whereType<Map>()
      .map((item) => NckhRecord.fromJson(Map<String, dynamic>.from(item)))
      .toList(growable: false);
}

List<DetailField> _fields(
  PersonalActivityType type,
  Map<String, dynamic> json,
) {
  final entries = switch (type) {
    PersonalActivityType.teaching => <(String, dynamic)>[
      ('Mã học phần', json['MaHocPhan']),
      ('Lớp', json['TenLop'] ?? json['LopHocPhan']),
      ('Bộ môn', json['BoMon']),
      ('Số tín chỉ', json['SoTinChi']),
      ('Số sinh viên', json['SoSinhVien']),
      ('Quy chuẩn', json['QuyChuan']),
      ('Hệ đào tạo', json['ten_he_dao_tao']),
      ('Bắt đầu', _dateLabel(json['NgayBatDau'])),
      ('Kết thúc', _dateLabel(json['NgayKetThuc'])),
    ],
    PersonalActivityType.outsideStandard => <(String, dynamic)>[
      ('Mô tả', json['mo_ta_hoat_dong'] ?? json['moTaHoatDong']),
      ('Theo quyết định', json['theo_qd']),
      ('Số ngày', json['so_ngay']),
      ('Quy đổi', json['so_tiet_quy_doi']),
      ('Ghi chú', json['ghi_chu']),
    ],
    PersonalActivityType.exam => <(String, dynamic)>[
      ('Hình thức', json['hinh_thuc'] ?? json['hinhthuc']),
      ('Mã học phần', json['ma_hoc_phan'] ?? json['mahocphan']),
      ('Lớp học phần', json['lop_hoc_phan'] ?? json['lophocphan']),
      ('Hệ số', json['he_so'] ?? json['heso']),
      ('Số tiết quy chuẩn', json['quy_chuan'] ?? json['sotietqc']),
      ('Hệ đào tạo', json['ten_he_dao_tao']),
    ],
    PersonalActivityType.project => <(String, dynamic)>[
      ('Sinh viên', json['SinhVien'] ?? json['TenSinhVien']),
      ('Mã sinh viên', json['MaSV']),
      ('Loại hướng dẫn', json['loai_huong_dan']),
      ('Số quyết định', json['SoQD']),
      ('Bắt đầu', _dateLabel(json['NgayBatDau'])),
      ('Kết thúc', _dateLabel(json['NgayKetThuc'])),
    ],
    PersonalActivityType.fieldTrip => <(String, dynamic)>[
      ('Ngành học', json['nganh_hoc']),
      ('Theo quyết định', json['theo_qd']),
      ('Số ngày', json['so_ngay']),
      ('Quy đổi', json['so_tiet_quy_doi']),
      ('Ghi chú', json['ghi_chu']),
    ],
  };
  return entries
      .where((entry) => _string(entry.$2) != null)
      .map((entry) => DetailField(entry.$1, _string(entry.$2)!))
      .toList(growable: false);
}

String? _term(dynamic value) {
  final text = _string(value);
  return text == null ? null : 'Học kỳ $text';
}

String? _join(List<String?> values) {
  final result = values.whereType<String>().where((item) => item.isNotEmpty);
  final text = result.join(' • ');
  return text.isEmpty ? null : text;
}

String? _dateLabel(dynamic value) {
  final date = _date(value);
  if (date == null) return _string(value);
  final local = date.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
}

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

String? _string(dynamic value) {
  final text = value?.toString().trim();
  return text == null || text.isEmpty ? null : text;
}

double _number(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}

int? _integer(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}

DateTime? _date(dynamic value) => DateTime.tryParse(value?.toString() ?? '');
