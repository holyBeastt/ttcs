import 'package:flutter_test/flutter_test.dart';
import 'package:dio/dio.dart';

import 'package:mobile_app/models/account.dart';
import 'package:mobile_app/models/auth_session.dart';
import 'package:mobile_app/models/personal_details.dart';
import 'package:mobile_app/models/statistics.dart';
import 'package:mobile_app/models/unit_statistics.dart';
import 'package:mobile_app/services/api_client.dart';
import 'package:mobile_app/services/auth_repository.dart';
import 'package:mobile_app/services/dashboard_cache.dart';
import 'package:mobile_app/services/statistics_repository.dart';
import 'package:mobile_app/services/token_store.dart';
import 'package:mobile_app/utils/currency_format.dart';

class _UnauthorizedClient extends ApiClient {
  _UnauthorizedClient()
    : super(baseUrl: 'http://localhost', tokenStore: TokenStore());

  @override
  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    throw const ApiException('Phiên đăng nhập đã hết hạn.', statusCode: 401);
  }
}

class _MemoryDashboardCache extends DashboardCache {
  _MemoryDashboardCache(this.cached);

  final PersonalDashboard cached;

  @override
  Future<PersonalDashboard?> read(String key) async => cached;
}

class _NoopDashboardCache extends DashboardCache {
  @override
  Future<PersonalDashboard?> read(String key) async => null;

  @override
  Future<void> save(String key, PersonalDashboard dashboard) async {}
}

class _StatsStubClient extends ApiClient {
  _StatsStubClient(this.responses)
    : super(baseUrl: 'http://localhost', tokenStore: TokenStore());

  final Map<String, dynamic> responses;

  @override
  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    if (!responses.containsKey(path)) {
      throw StateError('Unexpected GET $path');
    }
    return Response<dynamic>(
      requestOptions: RequestOptions(path: path),
      data: responses[path],
      statusCode: 200,
    );
  }
}

class _MemoryTokenStore extends TokenStore {
  AuthSession? stored;

  @override
  Future<void> save(AuthSession session) async => stored = session;

  @override
  Future<AuthSession?> read() async => stored;
}

class _AccountStubClient extends ApiClient {
  _AccountStubClient(this.memoryStore)
    : super(baseUrl: 'http://localhost', tokenStore: memoryStore);

  final _MemoryTokenStore memoryStore;
  final requests = <String, Object?>{};

  @override
  Future<Response<dynamic>> get(
    String path, {
    Map<String, dynamic>? queryParameters,
  }) async {
    requests['GET $path'] = queryParameters;
    return Response<dynamic>(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {
        'success': true,
        'data': {
          'id_User': 42,
          'username': 'gv001',
          'TenNhanVien': 'Nguyễn Văn A',
          'DienThoai': '0900000000',
          'DiaChiHienNay': 'Địa chỉ cũ',
          'MaPhongBan': 'CNTT',
          'Quyen': 'USER',
        },
      },
    );
  }

  @override
  Future<Response<dynamic>> patch(String path, {Object? data}) async {
    requests['PATCH $path'] = data;
    return Response<dynamic>(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {
        'success': true,
        'data': {
          'id_User': 42,
          'username': 'gv001',
          'TenNhanVien': 'Nguyễn Văn A',
          'DienThoai': '0912345678',
          'DiaChiHienNay': 'Địa chỉ mới',
          'MaPhongBan': 'CNTT',
        },
      },
    );
  }

  @override
  Future<Response<dynamic>> post(String path, {Object? data}) async {
    requests['POST $path'] = data;
    return Response<dynamic>(
      requestOptions: RequestOptions(path: path),
      statusCode: 200,
      data: {
        'success': true,
        'accessToken': 'new-access',
        'refreshToken': 'new-refresh',
      },
    );
  }
}

void main() {
  test('formats dashboard payments compactly without losing exact values', () {
    expect(formatCurrencyExact(0), '0 đ');
    expect(formatCurrencyExact(2_196), '2.196 đ');
    expect(formatCurrencyExact(-1_250_000), '-1.250.000 đ');
    expect(formatCurrencyCompact(2_196), '2.196 đ');
    expect(formatCurrencyCompact(12_500_000), '12,5 triệu đ');
    expect(formatCurrencyCompact(1_250_000_000), '1,25 tỷ đ');
    expect(formatCurrencyCompact(2_000_000_000_000), '2 nghìn tỷ đ');
  });

  test('parses the backend login payload', () {
    final session = AuthSession.fromJson({
      'accessToken': 'access',
      'refreshToken': 'refresh',
      'id_User': 42,
      'username': 'gv001',
      'TenNhanVien': 'Nguyễn Văn A',
      'role': 'USER',
      'MaPhongBan': 'CNTT',
      'isKhoa': 0,
    });

    expect(session.userId, 42);
    expect(session.employeeName, 'Nguyễn Văn A');
    expect(session.departmentCode, 'CNTT');
  });

  test('loads and updates the signed-in account profile', () async {
    final tokenStore = _MemoryTokenStore();
    final client = _AccountStubClient(tokenStore);
    final repository = AuthRepository(client);

    final profile = await repository.getProfile();
    expect(profile, isA<UserProfile>());
    expect(profile.employeeName, 'Nguyễn Văn A');
    expect(profile.phone, '0900000000');

    final updated = await repository.updateContact(
      phone: '0912345678',
      currentAddress: 'Địa chỉ mới',
    );
    expect(updated.phone, '0912345678');
    expect(client.requests['PATCH /api/mobile/v1/me/contact'], {
      'phone': '0912345678',
      'currentAddress': 'Địa chỉ mới',
    });
  });

  test('rotates access and refresh tokens after password change', () async {
    final tokenStore = _MemoryTokenStore();
    final client = _AccountStubClient(tokenStore);
    final repository = AuthRepository(client);
    final session = const AuthSession(
      accessToken: 'old-access',
      refreshToken: 'old-refresh',
      userId: 42,
      username: 'gv001',
    );

    final updated = await repository.changePassword(
      session: session,
      currentPassword: 'old-password',
      newPassword: 'new-password',
    );
    expect(updated.accessToken, 'new-access');
    expect(updated.refreshToken, 'new-refresh');
    expect(tokenStore.stored?.accessToken, 'new-access');
    expect(client.requests['POST /api/mobile/v1/me/change-password'], {
      'currentPassword': 'old-password',
      'newPassword': 'new-password',
    });
  });

  test('maps the Vượt Giờ summary without client-side calculations', () {
    final summary = VuotGioSummary.fromJson({
      'giangVien': 'Nguyễn Văn A',
      'soTietNCKH': 12.5,
      'tongThucHien': 80,
      'dinhMucSauMienGiam': 56,
      'thieuNCKH': 7.5,
      'tongVuot': 10,
      'thanhToan': 8,
    });

    expect(summary.teacherName, 'Nguyễn Văn A');
    expect(summary.researchHours, 12.5);
    expect(summary.adjustedQuota, 56);
    expect(summary.researchShortage, 7.5);
    expect(summary.totalOvertime, 10);
    expect(summary.payment, 8);
    expect(VuotGioSummary.fromJson(summary.toJson()).adjustedQuota, 56);
  });

  test('parses unit statistics response and keeps backend aggregates', () {
    final stats = UnitVuotGioStats.fromJson({
      'data': [
        {
          'maKhoa': 'CNTT',
          'tenKhoa': 'Công nghệ thông tin',
          'tongSoGV': 4,
          'tongThucHien': 353.08,
          'tongVuot': 129.08,
          'thanhToan': 129,
        },
      ],
      'summary': {
        'tongSoGV': 4,
        'tongSoKhoa': 1,
        'tongThucHien': 353.08,
        'tongVuot': 129.08,
        'tongThanhToan': 129,
      },
    });

    expect(stats.rows.single.isUnitRow, isTrue);
    expect(stats.rows.single.unitCode, 'CNTT');
    expect(stats.rows.single.totalOvertime, 129.08);
    expect(stats.summary.lecturerCount, 4);
    expect(stats.summary.totalPayment, 129);
  });

  test('parses NCKH unit rows and lock status', () {
    final unit = UnitOption.fromJson({
      'id': 12,
      'MaPhongBan': 'CNTT',
      'TenPhongBan': 'Công nghệ thông tin',
      'isKhoa': 1,
    });
    final nckh = UnitNckhRow.fromJson({
      'khoaId': 12,
      'maPhongBan': 'CNTT',
      'tenPhongBan': 'Công nghệ thông tin',
      'soCongTrinh': 10,
      'tongSoTiet': 911.67,
    });
    final lock = UnitLockStatus.fromJson({
      'locked': true,
      'lockInfo': {'ngay_chot': '2026-01-02T10:00:00Z', 'nguoi_chot_id': 7},
    });

    expect(unit.id, '12');
    expect(unit.code, 'CNTT');
    expect(unit.isFaculty, isTrue);
    expect(nckh.workCount, 10);
    expect(nckh.totalHours, 911.67);
    expect(lock.locked, isTrue);
    expect(lock.lockedBy, 7);
    expect(lock.lockedAt, isNotNull);
  });

  test('does not mask an expired session with a cached dashboard', () async {
    final cached = PersonalDashboard(
      academicYear: '2025 - 2026',
      scope: 'projected',
      vuotGio: const VuotGioSummary(totalCompleted: 1),
      nckh: const NckhSummary(),
    );
    final repository = StatisticsRepository(
      _UnauthorizedClient(),
      cache: _MemoryDashboardCache(cached),
    );
    final session = const AuthSession(
      accessToken: 'expired',
      refreshToken: 'refresh',
      userId: 11,
      username: 'thuanld',
    );

    await expectLater(
      repository.getPersonalDashboard(
        session: session,
        academicYear: '2025 - 2026',
        scope: 'projected',
      ),
      throwsA(
        isA<ApiException>().having((error) => error.statusCode, 'status', 401),
      ),
    );
  });

  test(
    'filters ALL academic years and keeps projected unit data read-only',
    () async {
      final repository = StatisticsRepository(
        _StatsStubClient({
          '/getNamHocVG': {
            'NamHoc': [
              {'NamHoc': 'ALL'},
              {'NamHoc': '2025 - 2026'},
            ],
          },
          '/v2/vuotgio/trang-thai-khoa': {
            'success': true,
            'locked': false,
            'lockInfo': null,
          },
          '/v2/vuotgio/tong-hop/khoa': {
            'success': true,
            'data': [
              {
                'maKhoa': 'CNTT',
                'tenKhoa': 'Công nghệ thông tin',
                'tongSoGV': 11,
                'tongThucHien': 3484.19,
                'tongVuot': 669.91,
                'thanhToan': 575.28,
              },
            ],
            'summary': {
              'tongSoGV': 11,
              'tongSoKhoa': 1,
              'tongThucHien': 3484.19,
              'tongVuot': 669.91,
              'tongThanhToan': 575.28,
            },
          },
          '/v3/nckh/stats/preview/khoa': {
            'success': true,
            'data': [
              {
                'khoaId': 2,
                'maPhongBan': 'CNTT',
                'tenPhongBan': 'Công nghệ thông tin',
                'soCongTrinh': 10,
                'tongSoTiet': 2060.01,
              },
            ],
          },
        }),
      );

      final years = await repository.getAcademicYears();
      expect(years.map((year) => year.value), ['2025 - 2026']);

      final dashboard = await repository.getUnitDashboard(
        academicYear: '2025 - 2026',
        unitId: '2',
        unitCode: 'CNTT',
        scope: 'projected',
      );
      expect(dashboard.lockStatus.locked, isFalse);
      expect(dashboard.vuotGio.summary.totalCompleted, 3484.19);
      expect(dashboard.vuotGioSource, 'projected_live');
      expect(dashboard.nckhSource, 'preview_live');
      expect(dashboard.nckh.single.totalHours, 2060.01);
    },
  );

  test('rejects official unit data before lock', () async {
    final repository = StatisticsRepository(
      _StatsStubClient({
        '/v2/vuotgio/trang-thai-khoa': {'locked': false},
      }),
      cache: _NoopDashboardCache(),
    );

    await expectLater(
      repository.getUnitDashboard(
        academicYear: '2025 - 2026',
        unitId: '2',
        unitCode: 'CNTT',
        scope: 'official',
      ),
      throwsA(
        isA<ApiException>().having(
          (error) => error.code,
          'code',
          'YEAR_NOT_LOCKED',
        ),
      ),
    );
  });

  test('loads official unit data from the locked snapshot', () async {
    final repository = StatisticsRepository(
      _StatsStubClient({
        '/v2/vuotgio/trang-thai-khoa': {'locked': true},
        '/v2/vuotgio/tong-hop/khoa': {
          'data': const [],
          'summary': {
            'tongSoGV': 0,
            'tongSoKhoa': 0,
            'tongThucHien': 0,
            'tongVuot': 0,
            'tongThanhToan': 0,
          },
        },
        '/v3/nckh/stats/khoa': {'data': const []},
        '/v3/nckh/stats/giang-vien': {'data': const []},
      }),
    );

    final dashboard = await repository.getUnitDashboard(
      academicYear: '2025 - 2026',
      unitId: '2',
      unitCode: 'CNTT',
      scope: 'official',
    );
    expect(dashboard.vuotGioSource, 'snapshot');
    expect(dashboard.nckhSource, 'official_live');
  });

  test(
    'parses personal detail records without exposing raw employee fields',
    () {
      final details = PersonalVuotGioDetails.fromJson({
        'giangVien': 'Nguyễn Văn A',
        'thongTinNhanVien': {
          'id_User': 11,
          'maKhoa': 'CNTT',
          'khoa': 'Công nghệ thông tin',
          'chucVu': 'Giảng viên',
        },
        'giangDay': [
          {
            'TenHocPhan': 'Mạng máy tính',
            'MaHocPhan': 'CNTT3719',
            'TenLop': 'LT9 01',
            'QuyChuan': '60.00',
            'CCCD': 'must not be rendered',
          },
        ],
        'kthp': [
          {
            'ten_hoc_phan': 'Lập trình',
            'hinh_thuc': 'Chấm thi',
            'sotietqc': '1.43',
          },
        ],
        'nckh': [
          {
            'id': 58,
            'tenCongTrinh': 'Công trình thử nghiệm',
            'vaiTroGiangVien': 'Tác giả',
            'soTietGiangVien': 12.5,
          },
        ],
      });

      expect(details.teacherName, 'Nguyễn Văn A');
      expect(details.employee?.departmentCode, 'CNTT');
      expect(details.teaching.single.title, 'Mạng máy tính');
      expect(details.teaching.single.hours, 60);
      expect(
        details.teaching.single.fields.any(
          (field) => field.value == 'must not be rendered',
        ),
        isFalse,
      );
      expect(details.exams.single.hours, 1.43);
      expect(details.research.single.lecturerHours, 12.5);
    },
  );

  test('loads personal detail endpoints with the selected scope', () async {
    final repository = StatisticsRepository(
      _StatsStubClient({
        '/v2/vuotgio/trang-thai-khoa': {'locked': false},
        '/v2/vuotgio/tong-hop/chi-tiet/11': {
          'success': true,
          'data': {'giangVien': 'Nguyễn Văn A', 'giangDay': []},
        },
        '/v3/nckh/stats/preview/giang-vien/11/cong-trinh': {
          'success': true,
          'data': [
            {
              'id': 1,
              'tenCongTrinh': 'Công trình thử nghiệm',
              'soTietGiangVien': 8,
            },
          ],
        },
      }),
    );
    const session = AuthSession(
      accessToken: 'access',
      refreshToken: 'refresh',
      userId: 11,
      username: 'thuanld',
    );

    final vuot = await repository.getPersonalVuotGioDetails(
      session: session,
      academicYear: '2025 - 2026',
      scope: 'projected',
    );
    final nckh = await repository.getPersonalNckhDetails(
      session: session,
      academicYear: '2025 - 2026',
      scope: 'projected',
    );

    expect(vuot.teacherName, 'Nguyễn Văn A');
    expect(nckh.single.title, 'Công trình thử nghiệm');
  });

  test(
    'loads the official personal summary from snapshot statistics',
    () async {
      final repository = StatisticsRepository(
        _StatsStubClient({
          '/v2/vuotgio/trang-thai-khoa': {'locked': true},
          '/v2/vuotgio/tong-hop/giang-vien-snapshot': {
            'success': true,
            'data': [
              {
                'id_User': 11,
                'giangVien': 'Nguyễn Văn A',
                'soTietNCKH': 12.5,
                'tongThucHien': 80,
                'tongVuot': 10,
                'thanhToan': 7,
              },
            ],
          },
          '/v3/nckh/stats/giang-vien': {
            'success': true,
            'data': [
              {'lecturerId': 11, 'soCongTrinh': 1, 'tongSoTietGiangVien': 12.5},
            ],
          },
        }),
        cache: _NoopDashboardCache(),
      );
      const session = AuthSession(
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 11,
        username: 'thuanld',
      );

      final dashboard = await repository.getPersonalDashboard(
        session: session,
        academicYear: '2025 - 2026',
        scope: 'official',
      );

      expect(dashboard.vuotGio.totalOvertime, 10);
      expect(dashboard.vuotGioSource, 'snapshot');
    },
  );

  test(
    'uses the official snapshot SDO endpoint for personal details',
    () async {
      final repository = StatisticsRepository(
        _StatsStubClient({
          '/v2/vuotgio/trang-thai-khoa': {'locked': true},
          '/v2/vuotgio/tong-hop/data-snapshot/11': {
            'success': true,
            'data': {
              'giangVien': 'Nguyễn Văn A',
              'raw': {
                'giangDay': const [],
                'kthp': const [],
                'doAn': const [],
                'hdtq': const [],
                'nckhRecords': const [],
              },
            },
          },
        }),
      );
      const session = AuthSession(
        accessToken: 'access',
        refreshToken: 'refresh',
        userId: 11,
        username: 'thuanld',
      );

      final details = await repository.getPersonalVuotGioDetails(
        session: session,
        academicYear: '2025 - 2026',
        scope: 'official',
      );
      expect(details.teacherName, 'Nguyễn Văn A');
      expect(details.teaching, isEmpty);
    },
  );
}
