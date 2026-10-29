/// Statistics returned by the unit/faculty dashboard APIs.
///
/// The backend uses a department id for NCKH endpoints and a department code
/// for Vượt Giờ endpoints, so [UnitOption] deliberately keeps both values.
class UnitOption {
  const UnitOption({
    required this.id,
    required this.code,
    required this.name,
    this.isFaculty,
  });

  final String id;
  final String? code;
  final String name;
  final bool? isFaculty;

  factory UnitOption.fromJson(Map<String, dynamic> json) {
    final rawId = json['id'] ?? json['khoaId'] ?? json['khoa_id'];
    final rawCode =
        json['MaPhongBan'] ??
        json['maPhongBan'] ??
        json['maKhoa'] ??
        json['code'];
    final rawName =
        json['TenPhongBan'] ??
        json['tenPhongBan'] ??
        json['tenKhoa'] ??
        json['name'];
    final id = rawId?.toString().trim();
    final code = rawCode?.toString().trim();
    return UnitOption(
      id: id == null || id.isEmpty ? (code ?? 'ALL') : id,
      code: code == null || code.isEmpty ? null : code,
      name: rawName?.toString().trim().isNotEmpty == true
          ? rawName.toString()
          : (code ?? 'Không xác định'),
      isFaculty: _bool(json['isKhoa'] ?? json['isFaculty']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'MaPhongBan': code,
    'TenPhongBan': name,
    if (isFaculty != null) 'isKhoa': isFaculty,
  };
}

class UnitLockStatus {
  const UnitLockStatus({
    required this.locked,
    this.lockedAt,
    this.lockedBy,
    this.lockedByName,
  });

  final bool locked;
  final DateTime? lockedAt;
  final int? lockedBy;
  final String? lockedByName;

  factory UnitLockStatus.fromJson(Map<String, dynamic> json) {
    final info = _map(json['lockInfo']);
    return UnitLockStatus(
      locked: _bool(json['locked']) ?? false,
      lockedAt: _date(
        info['ngay_chot'] ??
            info['lockedAt'] ??
            info['locked_at'] ??
            json['lockedAt'],
      ),
      lockedBy: _int(
        info['nguoi_chot_id'] ?? info['lockedBy'] ?? json['lockedBy'],
      ),
      lockedByName: _string(
        info['nguoi_chot_name'] ?? info['lockedByName'] ?? json['lockedByName'],
      ),
    );
  }

  Map<String, dynamic> toJson() => {
    'locked': locked,
    'lockedAt': lockedAt?.toIso8601String(),
    'lockedBy': lockedBy,
    'lockedByName': lockedByName,
  };
}

class UnitVuotGioRow {
  const UnitVuotGioRow({
    this.lecturerId,
    this.teacherName,
    this.unitCode,
    this.unitName,
    this.lecturerCount = 0,
    this.teachingHours = 0,
    this.outsideStandardHours = 0,
    this.examHours = 0,
    this.projectHours = 0,
    this.councilHours = 0,
    this.researchHours = 0,
    this.totalCompleted = 0,
    this.totalOvertime = 0,
    this.payment = 0,
    this.researchShortage = 0,
    this.teachingShortage = 0,
  });

  final int? lecturerId;
  final String? teacherName;
  final String? unitCode;
  final String? unitName;
  final int lecturerCount;
  final double teachingHours;
  final double outsideStandardHours;
  final double examHours;
  final double projectHours;
  final double councilHours;
  final double researchHours;
  final double totalCompleted;
  final double totalOvertime;
  final double payment;
  final double researchShortage;
  final double teachingShortage;

  bool get isUnitRow => lecturerId == null;

  factory UnitVuotGioRow.fromJson(Map<String, dynamic> json) {
    return UnitVuotGioRow(
      lecturerId: _int(json['id_User'] ?? json['lecturerId'] ?? json['maGV']),
      teacherName: _string(
        json['giangVien'] ?? json['tenNhanVien'] ?? json['teacherName'],
      ),
      unitCode: _string(
        json['maKhoa'] ??
            json['MaPhongBan'] ??
            json['maPhongBan'] ??
            json['khoa'],
      ),
      unitName: _string(
        json['tenKhoa'] ?? json['TenPhongBan'] ?? json['unitName'],
      ),
      lecturerCount: _number(json['tongSoGV'] ?? json['lecturerCount']).round(),
      teachingHours: _number(json['soTietGiangDay']),
      outsideStandardHours: _number(json['soTietNgoaiQC']),
      examHours: _number(json['soTietKTHP']),
      projectHours: _number(json['soTietDoAn']),
      councilHours: _number(json['soTietHDTQ']),
      researchHours: _number(json['soTietNCKH']),
      totalCompleted: _number(json['tongThucHien']),
      totalOvertime: _number(json['tongVuot']),
      payment: _number(json['thanhToan']),
      researchShortage: _number(json['thieuNCKH']),
      teachingShortage: _number(json['thieuTietGiangDay']),
    );
  }

  Map<String, dynamic> toJson() => {
    'id_User': lecturerId,
    'giangVien': teacherName,
    'maKhoa': unitCode,
    'tenKhoa': unitName,
    'tongSoGV': lecturerCount,
    'soTietGiangDay': teachingHours,
    'soTietNgoaiQC': outsideStandardHours,
    'soTietKTHP': examHours,
    'soTietDoAn': projectHours,
    'soTietHDTQ': councilHours,
    'soTietNCKH': researchHours,
    'tongThucHien': totalCompleted,
    'tongVuot': totalOvertime,
    'thanhToan': payment,
    'thieuNCKH': researchShortage,
    'thieuTietGiangDay': teachingShortage,
  };
}

class UnitVuotGioSummary {
  const UnitVuotGioSummary({
    this.lecturerCount = 0,
    this.unitCount = 0,
    this.totalCompleted = 0,
    this.totalOvertime = 0,
    this.totalPayment = 0,
    this.lockedAt,
    this.lockedBy,
    this.lockedByName,
  });

  final int lecturerCount;
  final int unitCount;
  final double totalCompleted;
  final double totalOvertime;
  final double totalPayment;
  final DateTime? lockedAt;
  final int? lockedBy;
  final String? lockedByName;

  factory UnitVuotGioSummary.fromJson(Map<String, dynamic> json) {
    return UnitVuotGioSummary(
      lecturerCount: _number(json['tongSoGV']).round(),
      unitCount: _number(json['tongSoKhoa']).round(),
      totalCompleted: _number(json['tongThucHien']),
      totalOvertime: _number(json['tongVuot']),
      totalPayment: _number(json['tongThanhToan'] ?? json['thanhToan']),
      lockedAt: _date(json['ngayChot'] ?? json['ngay_chot']),
      lockedBy: _int(json['nguoiChotId'] ?? json['nguoi_chot_id']),
      lockedByName: _string(json['nguoiChotName'] ?? json['nguoi_chot_name']),
    );
  }

  Map<String, dynamic> toJson() => {
    'tongSoGV': lecturerCount,
    'tongSoKhoa': unitCount,
    'tongThucHien': totalCompleted,
    'tongVuot': totalOvertime,
    'tongThanhToan': totalPayment,
    'ngayChot': lockedAt?.toIso8601String(),
    'nguoiChotId': lockedBy,
    'nguoiChotName': lockedByName,
  };
}

class UnitVuotGioStats {
  const UnitVuotGioStats({required this.rows, required this.summary});

  final List<UnitVuotGioRow> rows;
  final UnitVuotGioSummary summary;

  factory UnitVuotGioStats.fromJson(Map<String, dynamic> json) {
    final rawRows = json['data'];
    return UnitVuotGioStats(
      rows: rawRows is List
          ? rawRows
                .whereType<Map>()
                .map(
                  (item) =>
                      UnitVuotGioRow.fromJson(Map<String, dynamic>.from(item)),
                )
                .toList(growable: false)
          : const [],
      summary: UnitVuotGioSummary.fromJson(_map(json['summary'])),
    );
  }

  Map<String, dynamic> toJson() => {
    'data': rows.map((row) => row.toJson()).toList(),
    'summary': summary.toJson(),
  };
}

class UnitNckhRow {
  const UnitNckhRow({
    this.unitId,
    this.unitCode,
    this.unitName,
    this.workCount = 0,
    this.totalHours = 0,
  });

  final int? unitId;
  final String? unitCode;
  final String? unitName;
  final int workCount;
  final double totalHours;

  factory UnitNckhRow.fromJson(Map<String, dynamic> json) => UnitNckhRow(
    unitId: _int(json['khoaId'] ?? json['khoa_id'] ?? json['id']),
    unitCode: _string(json['maPhongBan'] ?? json['MaPhongBan']),
    unitName: _string(json['tenPhongBan'] ?? json['TenPhongBan']),
    workCount: _number(json['soCongTrinh'] ?? json['cong_trinh_count']).round(),
    totalHours: _number(json['tongSoTiet'] ?? json['tong_so_tiet']),
  );

  Map<String, dynamic> toJson() => {
    'khoaId': unitId,
    'maPhongBan': unitCode,
    'tenPhongBan': unitName,
    'soCongTrinh': workCount,
    'tongSoTiet': totalHours,
  };
}

class UnitDashboard {
  const UnitDashboard({
    required this.academicYear,
    required this.scope,
    required this.unitId,
    required this.vuotGio,
    required this.nckh,
    required this.lockStatus,
    required this.vuotGioSource,
    required this.nckhSource,
    this.vuotGioAvailable = true,
  });

  final String academicYear;

  /// User-requested scope: projected live or official (locked Vượt Giờ
  /// snapshot). NCKH has no separate snapshot API, so its official source is
  /// the approved statistics endpoint.
  final String scope;
  final String unitId;
  final UnitVuotGioStats vuotGio;
  final List<UnitNckhRow> nckh;
  final UnitLockStatus lockStatus;
  final String vuotGioSource;
  final String nckhSource;
  final bool vuotGioAvailable;

  bool get isCompositeSource =>
      vuotGioSource != nckhSource &&
      (vuotGioSource == 'snapshot' || nckhSource == 'official_live');
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

int? _int(dynamic value) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '');
}

double _number(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}

bool? _bool(dynamic value) {
  if (value is bool) return value;
  if (value is num) return value != 0;
  final text = value?.toString().toLowerCase();
  if (text == 'true' || text == '1') return true;
  if (text == 'false' || text == '0') return false;
  return null;
}

DateTime? _date(dynamic value) => DateTime.tryParse(value?.toString() ?? '');
