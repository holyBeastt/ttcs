import '../models/auth_session.dart';
import '../models/statistics.dart';
import '../models/unit_statistics.dart';
import '../models/personal_details.dart';
import 'api_client.dart';
import 'dashboard_cache.dart';

class StatisticsRepository {
  const StatisticsRepository(
    this.client, {
    this.cache = const DashboardCache(),
  });

  final ApiClient client;
  final DashboardCache cache;

  static String _normalizeScope(String scope) =>
      scope == 'projected' ? 'projected' : 'official';

  Future<List<AcademicYear>> getAcademicYears() async {
    try {
      final response = await client.get('/getNamHocVG');
      final body = _map(response.data);
      final rows = body['NamHoc'];
      final values = _values(rows);
      if (values.isNotEmpty) return values.map(AcademicYear.new).toList();
    } on ApiException {
      // Try the generic endpoint for installations that do not expose /getNamHocVG.
    }

    final response = await client.get('/api/namhoc');
    final values = _values(response.data);
    return values.map(AcademicYear.new).toList();
  }

  Future<PersonalDashboard> getPersonalDashboard({
    required AuthSession session,
    required String academicYear,
    required String scope,
  }) async {
    final normalizedScope = _normalizeScope(scope);
    final cacheKey = cache.key(
      userId: session.userId,
      year: academicYear,
      scope: normalizedScope,
    );
    try {
      final lockStatus = await getUnitLockStatus(academicYear);
      if (normalizedScope == 'official' && !lockStatus.locked) {
        throw const ApiException(
          'Năm học chưa được khóa; Chính thức (Snapshot) chưa khả dụng.',
          statusCode: 423,
          code: 'YEAR_NOT_LOCKED',
        );
      }
      final isSnapshot = normalizedScope == 'official';
      // The official summary is a statistics response, not the personal
      // detail endpoint.  The backend scopes this snapshot list to the
      // bearer user (or to the user's faculty for authorized faculty users),
      // then we select the current lecturer's row locally.
      final vuotGioPath = isSnapshot
          ? '/v2/vuotgio/tong-hop/giang-vien-snapshot'
          : '/v2/vuotgio/tong-hop/data-chuan/${session.userId}';
      final vuotGioResponse = await client.get(
        vuotGioPath,
        queryParameters: {
          'namHoc': academicYear,
          if (!isSnapshot) 'isDuKien': true,
        },
      );
      final vuotGioBody = _map(vuotGioResponse.data);
      final vuotGioPayload = isSnapshot
          ? _findLecturerRow(vuotGioBody['data'], session.userId)
          : vuotGioBody['data'];
      if (isSnapshot && vuotGioPayload == null) {
        throw const ApiException(
          'Không tìm thấy dữ liệu snapshot của giảng viên trong năm học đã khóa.',
          statusCode: 404,
          code: 'SNAPSHOT_LECTURER_NOT_FOUND',
        );
      }
      final vuotGio = VuotGioSummary.fromJson(_map(vuotGioPayload));

      final effectiveNckhScope = normalizedScope == 'projected'
          ? 'projected'
          : 'official';
      final path = effectiveNckhScope == 'projected'
          ? '/v3/nckh/stats/preview/giang-vien'
          : '/v3/nckh/stats/giang-vien';
      final nckhResponse = await client.get(
        path,
        queryParameters: {
          'namHoc': academicYear,
          'khoaId': 'ALL',
          'keyword': '',
        },
      );
      final data = _map(nckhResponse.data)['data'];
      final rows = data is List ? data : <dynamic>[];
      final row = rows.cast<dynamic>().firstWhere(
        (item) => _number(_map(item)['lecturerId']) == session.userId,
        orElse: () => null,
      );
      final dashboard = PersonalDashboard(
        academicYear: academicYear,
        scope: normalizedScope,
        vuotGio: vuotGio,
        nckh: NckhSummary.fromJson(row, source: effectiveNckhScope),
        vuotGioSource: isSnapshot
            ? 'snapshot'
            : normalizedScope == 'projected'
            ? 'projected_live'
            : 'official_live',
        nckhSource: effectiveNckhScope == 'projected'
            ? 'preview_live'
            : 'official_live',
      );
      await cache.save(cacheKey, dashboard);
      return dashboard;
    } on ApiException catch (error) {
      // A stale cache must not mask an expired session. Let the controller
      // clear auth state and return to login when refresh also fails.
      if (error.statusCode == 401 ||
          error.statusCode == 423 ||
          error.code == 'YEAR_NOT_LOCKED') {
        rethrow;
      }
      final cached = await cache.read(cacheKey);
      if (cached != null) return cached;
      rethrow;
    }
  }

  Future<PersonalVuotGioDetails> getPersonalVuotGioDetails({
    required AuthSession session,
    required String academicYear,
    required String scope,
  }) async {
    final lockStatus = await getUnitLockStatus(academicYear);
    final normalizedScope = _normalizeScope(scope);
    if (normalizedScope == 'official' && !lockStatus.locked) {
      throw const ApiException(
        'Năm học chưa được khóa; Chính thức (Snapshot) chưa khả dụng.',
        statusCode: 423,
        code: 'YEAR_NOT_LOCKED',
      );
    }
    final isSnapshot = normalizedScope == 'official';
    final response = isSnapshot
        ? await client.get(
            '/v2/vuotgio/tong-hop/data-snapshot/${session.userId}',
            queryParameters: {'namHoc': academicYear},
          )
        : await client.get(
            '/v2/vuotgio/tong-hop/chi-tiet/${session.userId}',
            queryParameters: {'namHoc': academicYear, 'isDuKien': true},
          );
    return PersonalVuotGioDetails.fromJson(_map(response.data)['data']);
  }

  Future<List<NckhRecord>> getPersonalNckhDetails({
    required AuthSession session,
    required String academicYear,
    required String scope,
  }) async {
    final lockStatus = await getUnitLockStatus(academicYear);
    final normalizedScope = _normalizeScope(scope);
    if (normalizedScope == 'official' && !lockStatus.locked) {
      throw const ApiException(
        'Năm học chưa được khóa; Chính thức (Snapshot) chưa khả dụng.',
        statusCode: 423,
        code: 'YEAR_NOT_LOCKED',
      );
    }
    final effectiveScope = normalizedScope;
    final path = effectiveScope == 'projected'
        ? '/v3/nckh/stats/preview/giang-vien'
        : '/v3/nckh/stats/giang-vien';
    final response = await client.get(
      '$path/${session.userId}/cong-trinh',
      queryParameters: {'namHoc': academicYear},
    );
    final data = _map(response.data)['data'];
    if (data is! List) return const [];
    return data
        .whereType<Map>()
        .map((item) => NckhRecord.fromJson(Map<String, dynamic>.from(item)))
        .toList(growable: false);
  }

  /// Returns the units visible to the signed-in user. NCKH's filter endpoint
  /// is the shared source of department ids, names and codes.
  Future<List<UnitOption>> getUnitOptions() async {
    dynamic response;
    try {
      response = await client.get('/v3/nckh/stats/filters');
    } on ApiException {
      response = await client.get('/v3/nckh/stats/preview/filters');
    }

    final body = _map(response.data);
    final data = _map(body['data']);
    final rows = data['khoaList'] ?? body['khoaList'] ?? body['data'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map>()
        .map((item) => UnitOption.fromJson(Map<String, dynamic>.from(item)))
        .where((item) => item.id.isNotEmpty)
        .toList(growable: false);
  }

  Future<UnitLockStatus> getUnitLockStatus(String academicYear) async {
    final response = await client.get(
      '/v2/vuotgio/trang-thai-khoa',
      queryParameters: {'namHoc': academicYear},
    );
    return UnitLockStatus.fromJson(_map(response.data));
  }

  /// Loads the Vượt Giờ faculty/department projection. The backend serves
  /// this endpoint from the immutable snapshot and therefore requires a
  /// locked academic year.
  Future<UnitVuotGioStats> getUnitVuotGioStats({
    required String academicYear,
    String unitCode = 'ALL',
  }) async {
    final response = await client.get(
      '/v2/vuotgio/tong-hop/khoa',
      queryParameters: {'namHoc': academicYear, 'khoa': unitCode},
    );
    return UnitVuotGioStats.fromJson(_map(response.data));
  }

  Future<List<UnitNckhRow>> getUnitNckhStats({
    required String academicYear,
    String unitId = 'ALL',
    String scope = 'official',
  }) async {
    // NCKH has no snapshot source of its own. After a Vượt Giờ lock, the
    // only truthful NCKH source available to mobile is official live stats.
    final path = _normalizeScope(scope) == 'projected'
        ? '/v3/nckh/stats/preview/khoa'
        : '/v3/nckh/stats/khoa';
    final response = await client.get(
      path,
      queryParameters: {'namHoc': academicYear, 'khoaId': unitId},
    );
    final body = _map(response.data);
    final rows = body['data'];
    if (rows is! List) return const [];
    return rows
        .whereType<Map>()
        .map((item) => UnitNckhRow.fromJson(Map<String, dynamic>.from(item)))
        .toList(growable: false);
  }

  /// Loads both unit dashboards without aggregating raw lecturer rows on the
  /// client. Aggregation remains owned by the backend services.
  Future<UnitDashboard> getUnitDashboard({
    required String academicYear,
    required String unitId,
    String unitCode = 'ALL',
    String scope = 'official',
  }) async {
    final normalizedScope = _normalizeScope(scope);
    final lockStatus = await getUnitLockStatus(academicYear);
    if (normalizedScope == 'official' && !lockStatus.locked) {
      throw const ApiException(
        'Năm học chưa được khóa; Chính thức (Snapshot) chưa khả dụng.',
        statusCode: 423,
        code: 'YEAR_NOT_LOCKED',
      );
    }

    // Official mobile data is the locked Vượt Giờ snapshot. Projected data is
    // the live calculation; the backend owns both aggregations.
    final useSnapshot = normalizedScope == 'official';
    final vuotGioFuture = useSnapshot
        ? getUnitVuotGioStats(academicYear: academicYear, unitCode: unitCode)
        : getUnitVuotGioLiveStats(
            academicYear: academicYear,
            unitCode: unitCode,
            isDuKien: true,
          );
    final nckhScope = normalizedScope;

    final results = await Future.wait<dynamic>([
      vuotGioFuture,
      getUnitNckhStats(
        academicYear: academicYear,
        unitId: unitId,
        scope: nckhScope,
      ),
    ]);
    return UnitDashboard(
      academicYear: academicYear,
      scope: normalizedScope,
      unitId: unitId,
      vuotGio: results[0] as UnitVuotGioStats,
      nckh: results[1] as List<UnitNckhRow>,
      lockStatus: lockStatus,
      vuotGioSource: useSnapshot
          ? 'snapshot'
          : normalizedScope == 'projected'
          ? 'projected_live'
          : 'official_live',
      nckhSource: nckhScope == 'projected' ? 'preview_live' : 'official_live',
    );
  }

  Future<UnitVuotGioStats> getUnitVuotGioLiveStats({
    required String academicYear,
    String unitCode = 'ALL',
    required bool isDuKien,
  }) async {
    final response = await client.get(
      '/v2/vuotgio/tong-hop/khoa',
      queryParameters: {
        'namHoc': academicYear,
        'khoa': unitCode,
        'isDuKien': isDuKien,
      },
    );
    return UnitVuotGioStats.fromJson(_map(response.data));
  }

  static Map<String, dynamic> _map(dynamic value) {
    if (value is Map<String, dynamic>) return value;
    if (value is Map) return Map<String, dynamic>.from(value);
    return <String, dynamic>{};
  }

  static List<String> _values(dynamic value) {
    if (value is! List) return const [];
    return value
        .map((item) {
          if (item is Map) {
            return item['NamHoc'] ?? item['namhoc'] ?? item['nam_hoc'];
          }
          return item;
        })
        .where((item) => item != null && item.toString().trim().isNotEmpty)
        .map((item) => item.toString())
        .where((item) => item.toUpperCase() != 'ALL')
        .toSet()
        .toList();
  }

  static int _number(dynamic value) {
    if (value is num) return value.toInt();
    return int.tryParse(value?.toString() ?? '') ?? 0;
  }

  static Map<String, dynamic>? _findLecturerRow(dynamic value, int lecturerId) {
    if (value is! List) return null;
    for (final item in value) {
      final row = _map(item);
      final id = _number(row['id_User'] ?? row['lecturerId'] ?? row['maGV']);
      if (id == lecturerId) return row;
    }
    return null;
  }
}
