class AcademicYear {
  const AcademicYear(this.value);

  final String value;
}

class VuotGioSummary {
  const VuotGioSummary({
    this.teacherName,
    this.department,
    this.academicYear,
    this.source,
    this.teachingHours = 0,
    this.outsideStandardHours = 0,
    this.examHours = 0,
    this.projectHours = 0,
    this.councilHours = 0,
    this.researchHours = 0,
    this.totalCompleted = 0,
    this.adjustedQuota,
    this.researchShortage = 0,
    this.totalOvertime = 0,
    this.payment = 0,
    this.updatedAt,
  });

  final String? teacherName;
  final String? department;
  final String? academicYear;
  final String? source;
  final double teachingHours;
  final double outsideStandardHours;
  final double examHours;
  final double projectHours;
  final double councilHours;
  final double researchHours;
  final double totalCompleted;
  final double? adjustedQuota;
  final double researchShortage;
  final double totalOvertime;
  final double payment;
  final DateTime? updatedAt;

  factory VuotGioSummary.fromJson(Map<String, dynamic> json) {
    return VuotGioSummary(
      teacherName: _firstString(json, ['giangVien', 'tenNhanVien']),
      department: _firstString(json, ['khoa', 'maKhoa']),
      academicYear: _firstString(json, ['nam_hoc', 'namHoc']),
      source: _firstString(json, ['source', 'nguon']),
      teachingHours: _number(json['soTietGiangDay']),
      outsideStandardHours: _number(json['soTietNgoaiQC']),
      examHours: _number(json['soTietKTHP']),
      projectHours: _number(json['soTietDoAn']),
      councilHours: _number(json['soTietHDTQ']),
      researchHours: _number(json['soTietNCKH']),
      totalCompleted: _number(json['tongThucHien']),
      adjustedQuota: json['dinhMucSauMienGiam'] == null
          ? null
          : _number(json['dinhMucSauMienGiam']),
      researchShortage: _number(json['thieuNCKH']),
      totalOvertime: _number(json['tongVuot']),
      payment: _number(json['thanhToan']),
      updatedAt: _date(json['updatedAt']),
    );
  }

  Map<String, dynamic> toJson() => {
    'giangVien': teacherName,
    'khoa': department,
    'nam_hoc': academicYear,
    'source': source,
    'soTietGiangDay': teachingHours,
    'soTietNgoaiQC': outsideStandardHours,
    'soTietKTHP': examHours,
    'soTietDoAn': projectHours,
    'soTietHDTQ': councilHours,
    'soTietNCKH': researchHours,
    'tongThucHien': totalCompleted,
    'dinhMucSauMienGiam': adjustedQuota,
    'thieuNCKH': researchShortage,
    'tongVuot': totalOvertime,
    'thanhToan': payment,
    'updatedAt': updatedAt?.toIso8601String(),
  };
}

class NckhSummary {
  const NckhSummary({this.works = 0, this.totalHours = 0, this.source});

  final int works;
  final double totalHours;
  final String? source;

  factory NckhSummary.fromJson(dynamic value, {String? source}) {
    if (value is! Map<String, dynamic>) {
      return NckhSummary(source: source);
    }
    return NckhSummary(
      works: _integer(value['soCongTrinh'] ?? value['cong_trinh_count']),
      totalHours: _number(
        value['tongSoTietGiangVien'] ??
            value['tongSoTiet'] ??
            value['tong_so_tiet'],
      ),
      source: source,
    );
  }

  Map<String, dynamic> toJson() => {
    'soCongTrinh': works,
    'tongSoTietGiangVien': totalHours,
    'source': source,
  };
}

class PersonalDashboard {
  const PersonalDashboard({
    required this.academicYear,
    required this.scope,
    required this.vuotGio,
    required this.nckh,
    this.vuotGioSource,
    this.nckhSource,
    this.isStale = false,
    this.cachedAt,
    this.warning,
  });

  final String academicYear;
  final String scope;
  final VuotGioSummary vuotGio;
  final NckhSummary nckh;
  final String? vuotGioSource;
  final String? nckhSource;
  final bool isStale;
  final DateTime? cachedAt;
  final String? warning;

  PersonalDashboard copyWith({
    bool? isStale,
    DateTime? cachedAt,
    String? warning,
  }) => PersonalDashboard(
    academicYear: academicYear,
    scope: scope,
    vuotGio: vuotGio,
    nckh: nckh,
    vuotGioSource: vuotGioSource,
    nckhSource: nckhSource,
    isStale: isStale ?? this.isStale,
    cachedAt: cachedAt ?? this.cachedAt,
    warning: warning ?? this.warning,
  );

  Map<String, dynamic> toJson() => {
    'academicYear': academicYear,
    'scope': scope,
    'vuotGio': vuotGio.toJson(),
    'nckh': nckh.toJson(),
    'vuotGioSource': vuotGioSource,
    'nckhSource': nckhSource,
    'cachedAt': cachedAt?.toIso8601String(),
  };

  factory PersonalDashboard.fromJson(Map<String, dynamic> json) =>
      PersonalDashboard(
        academicYear: json['academicYear']?.toString() ?? '',
        scope: json['scope']?.toString() ?? 'official',
        vuotGio: VuotGioSummary.fromJson(_map(json['vuotGio'])),
        nckh: NckhSummary.fromJson(_map(json['nckh'])),
        vuotGioSource: json['vuotGioSource']?.toString(),
        nckhSource: json['nckhSource']?.toString(),
        isStale: true,
        cachedAt: _date(json['cachedAt']),
      );
}

Map<String, dynamic> _map(dynamic value) {
  if (value is Map<String, dynamic>) return value;
  if (value is Map) return Map<String, dynamic>.from(value);
  return <String, dynamic>{};
}

String? _firstString(Map<String, dynamic> json, List<String> keys) {
  for (final key in keys) {
    final value = json[key];
    if (value != null && value.toString().trim().isNotEmpty) {
      return value.toString();
    }
  }
  return null;
}

double _number(dynamic value) {
  if (value is num) return value.toDouble();
  return double.tryParse(value?.toString().replaceAll(',', '') ?? '') ?? 0;
}

int _integer(dynamic value) => _number(value).round();

DateTime? _date(dynamic value) {
  if (value is DateTime) return value;
  return DateTime.tryParse(value?.toString() ?? '');
}
