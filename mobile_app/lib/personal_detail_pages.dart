import 'package:flutter/material.dart';

import 'models/auth_session.dart';
import 'models/personal_details.dart';
import 'services/api_client.dart';
import 'services/statistics_repository.dart';

class PersonalVuotGioDetailsPage extends StatefulWidget {
  const PersonalVuotGioDetailsPage({
    super.key,
    required this.repository,
    required this.session,
    required this.academicYear,
    required this.scope,
  });

  final StatisticsRepository repository;
  final AuthSession session;
  final String academicYear;
  final String scope;

  @override
  State<PersonalVuotGioDetailsPage> createState() =>
      _PersonalVuotGioDetailsPageState();
}

class _PersonalVuotGioDetailsPageState
    extends State<PersonalVuotGioDetailsPage> {
  late Future<PersonalVuotGioDetails> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = widget.repository.getPersonalVuotGioDetails(
      session: widget.session,
      academicYear: widget.academicYear,
      scope: widget.scope,
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Chi tiết Vượt Giờ')),
    body: FutureBuilder<PersonalVuotGioDetails>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return _DetailError(
            error: snapshot.error,
            onRetry: () => setState(_reload),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => setState(_reload),
          child: _VuotGioDetailsBody(data: snapshot.data!),
        );
      },
    ),
  );
}

class _VuotGioDetailsBody extends StatelessWidget {
  const _VuotGioDetailsBody({required this.data});

  final PersonalVuotGioDetails data;

  @override
  Widget build(BuildContext context) {
    final sections = [
      ('Giảng dạy', data.teaching),
      ('Ngoài quy chuẩn', data.outsideStandard),
      ('Kết thúc học phần', data.exams),
      ('Đồ án', data.projects),
      ('Hướng dẫn tham quan', data.fieldTrips),
    ];
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        _EmployeeCard(data: data),
        const SizedBox(height: 16),
        ...sections.expand(
          (section) => [
            _DetailSectionTitle(title: section.$1, count: section.$2.length),
            const SizedBox(height: 8),
            _ActivityList(records: section.$2),
            const SizedBox(height: 16),
          ],
        ),
        _DetailSectionTitle(title: 'NCKH', count: data.research.length),
        const SizedBox(height: 8),
        _NckhList(records: data.research),
      ],
    );
  }
}

class PersonalNckhDetailsPage extends StatefulWidget {
  const PersonalNckhDetailsPage({
    super.key,
    required this.repository,
    required this.session,
    required this.academicYear,
    required this.scope,
  });

  final StatisticsRepository repository;
  final AuthSession session;
  final String academicYear;
  final String scope;

  @override
  State<PersonalNckhDetailsPage> createState() =>
      _PersonalNckhDetailsPageState();
}

class _PersonalNckhDetailsPageState extends State<PersonalNckhDetailsPage> {
  late Future<List<NckhRecord>> _future;

  @override
  void initState() {
    super.initState();
    _reload();
  }

  void _reload() {
    _future = widget.repository.getPersonalNckhDetails(
      session: widget.session,
      academicYear: widget.academicYear,
      scope: widget.scope,
    );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(title: const Text('Chi tiết NCKH')),
    body: FutureBuilder<List<NckhRecord>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }
        if (snapshot.hasError || !snapshot.hasData) {
          return _DetailError(
            error: snapshot.error,
            onRetry: () => setState(_reload),
          );
        }
        return RefreshIndicator(
          onRefresh: () async => setState(_reload),
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            padding: const EdgeInsets.all(16),
            children: [
              _NckhSummaryCard(records: snapshot.data!),
              const SizedBox(height: 12),
              if (snapshot.data!.isEmpty)
                const _NoDetails(message: 'Chưa có công trình NCKH.')
              else
                ...snapshot.data!.map((record) => _NckhCard(record: record)),
            ],
          ),
        );
      },
    ),
  );
}

class _EmployeeCard extends StatelessWidget {
  const _EmployeeCard({required this.data});

  final PersonalVuotGioDetails data;

  @override
  Widget build(BuildContext context) {
    final employee = data.employee;
    final lines = [
      employee?.departmentName ?? employee?.departmentCode,
      employee?.position,
      if (employee?.reductionPercent != null)
        'Miễn giảm: ${employee!.reductionPercent}%',
    ].whereType<String>().where((item) => item.isNotEmpty).join(' • ');
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xff315be9), Color(0xff6078e8)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 15),
        child: Row(
          children: [
            const CircleAvatar(
              radius: 25,
              backgroundColor: Color(0x33ffffff),
              foregroundColor: Colors.white,
              child: Icon(Icons.person_outline),
            ),
            const SizedBox(width: 13),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    data.teacherName ?? employee?.name ?? 'Giảng viên',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 18,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 5),
                  Text(
                    lines.isEmpty ? 'Thông tin cá nhân' : lines,
                    maxLines: 3,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: .84),
                      fontSize: 13,
                      height: 1.35,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _DetailSectionTitle extends StatelessWidget {
  const _DetailSectionTitle({required this.title, required this.count});

  final String title;
  final int count;

  @override
  Widget build(BuildContext context) => Row(
    children: [
      Expanded(
        child: Text(
          title,
          style: Theme.of(context).textTheme.titleMedium
              ?.copyWith(fontWeight: FontWeight.bold),
        ),
      ),
      DecoratedBox(
        decoration: BoxDecoration(
          color: Theme.of(context).colorScheme.primaryContainer,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Text(
            '$count',
            style: TextStyle(
              color: Theme.of(context).colorScheme.onPrimaryContainer,
              fontWeight: FontWeight.w800,
            ),
          ),
        ),
      ),
    ],
  );
}

class _ActivityList extends StatelessWidget {
  const _ActivityList({required this.records});

  final List<PersonalActivityRecord> records;

  @override
  Widget build(BuildContext context) {
    if (records.isEmpty) return const _NoDetails(message: 'Chưa có dữ liệu.');
    return Column(
      children: records
          .map(
            (record) => Card(
              margin: const EdgeInsets.only(bottom: 10),
              child: ExpansionTile(
                tilePadding: const EdgeInsets.symmetric(horizontal: 14),
                childrenPadding: const EdgeInsets.only(bottom: 8),
                leading: const Icon(Icons.menu_book_outlined),
                title: Text(record.title),
                subtitle: record.subtitle == null
                    ? null
                    : Text(record.subtitle!),
                trailing: _HoursBadge(value: '${_number(record.hours)} tiết'),
                children: [
                  if (record.fields.isEmpty)
                    const ListTile(title: Text('Không có thông tin bổ sung.'))
                  else
                    ...record.fields.map(
                      (field) =>
                          _FieldTile(label: field.label, value: field.value),
                    ),
                ],
              ),
            ),
          )
          .toList(growable: false),
    );
  }
}

class _NckhSummaryCard extends StatelessWidget {
  const _NckhSummaryCard({required this.records});

  final List<NckhRecord> records;

  @override
  Widget build(BuildContext context) {
    final hours = records.fold<double>(
      0,
      (total, record) => total + record.lecturerHours,
    );
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            _SummaryMetric(
              icon: Icons.description_outlined,
              label: 'Công trình',
              value: records.length.toString(),
              color: const Color(0xff8e63ce),
            ),
            _SummaryMetric(
              icon: Icons.schedule_outlined,
              label: 'Số tiết cá nhân',
              value: _number(hours),
              color: const Color(0xff315be9),
            ),
          ],
        ),
      ),
    );
  }
}

class _NckhList extends StatelessWidget {
  const _NckhList({required this.records});

  final List<NckhRecord> records;

  @override
  Widget build(BuildContext context) {
    if (records.isEmpty) {
      return const _NoDetails(message: 'Chưa có công trình.');
    }
    return Column(
      children: records.map((record) => _NckhCard(record: record)).toList(),
    );
  }
}

class _NckhCard extends StatefulWidget {
  const _NckhCard({required this.record});

  final NckhRecord record;

  @override
  State<_NckhCard> createState() => _NckhCardState();
}

class _NckhCardState extends State<_NckhCard> {
  bool expanded = false;

  @override
  Widget build(BuildContext context) {
    final record = widget.record;
    final metadata = [
      record.typeLabel,
      record.lecturerRole,
      if (record.acceptedAt != null) _date(record.acceptedAt!),
    ].whereType<String>().where((item) => item.isNotEmpty).toList();
    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          InkWell(
            onTap: () => setState(() => expanded = !expanded),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(
                        Icons.science_outlined,
                        color: Color(0xff7050b2),
                      ),
                      const Spacer(),
                      Icon(
                        expanded
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Text(
                    record.title ?? 'Công trình NCKH',
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                  if (metadata.isNotEmpty) ...[
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 6,
                      runSpacing: 6,
                      children: metadata
                          .map((value) => _DetailChip(label: value))
                          .toList(),
                    ),
                  ],
                  const SizedBox(height: 10),
                  _HoursBadge(value: '${_number(record.lecturerHours)} tiết'),
                ],
              ),
            ),
          ),
          if (expanded) ...[
            const Divider(height: 1),
            const SizedBox(height: 8),
            if (record.classification != null)
              _FieldTile(label: 'Phân loại', value: record.classification!),
            if (record.code != null)
              _FieldTile(label: 'Mã số', value: record.code!),
            if (record.rating != null)
              _FieldTile(label: 'Xếp loại', value: record.rating!),
            if (record.totalWorkHours != 0)
              _FieldTile(
                label: 'Tổng số tiết công trình',
                value: _number(record.totalWorkHours),
              ),
            if (record.mainAuthors != null)
              _FieldTile(label: 'Tác giả chính', value: record.mainAuthors!),
            if (record.members != null && record.members!.isNotEmpty)
              _FieldTile(label: 'Thành viên', value: record.members!),
            const SizedBox(height: 8),
          ],
        ],
      ),
    );
  }
}

class _DetailChip extends StatelessWidget {
  const _DetailChip({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: const Color(0xfff0f2f8),
      borderRadius: BorderRadius.circular(8),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
      child: Text(label, style: Theme.of(context).textTheme.bodySmall),
    ),
  );
}

class _FieldTile extends StatelessWidget {
  const _FieldTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 112,
          child: Text(label, style: Theme.of(context).textTheme.bodySmall),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.w600),
          ),
        ),
      ],
    ),
  );
}

class _HoursBadge extends StatelessWidget {
  const _HoursBadge({required this.value});

  final String value;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.secondaryContainer,
      borderRadius: BorderRadius.circular(10),
    ),
    child: Padding(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
      child: Text(
        value,
        style: TextStyle(
          color: Theme.of(context).colorScheme.onSecondaryContainer,
          fontSize: 12,
          fontWeight: FontWeight.w800,
        ),
      ),
    ),
  );
}

class _SummaryMetric extends StatelessWidget {
  const _SummaryMetric({
    required this.icon,
    required this.label,
    required this.value,
    required this.color,
  });

  final IconData icon;
  final String label;
  final String value;
  final Color color;

  @override
  Widget build(BuildContext context) => Column(
    children: [
      DecoratedBox(
        decoration: BoxDecoration(
          color: color.withValues(alpha: .12),
          borderRadius: BorderRadius.circular(12),
        ),
        child: Padding(
          padding: const EdgeInsets.all(8),
          child: Icon(icon, size: 18, color: color),
        ),
      ),
      const SizedBox(height: 7),
      Text(
        value,
        style: Theme.of(context).textTheme.titleLarge
            ?.copyWith(fontWeight: FontWeight.w800),
      ),
      const SizedBox(height: 2),
      Text(label, style: Theme.of(context).textTheme.bodySmall),
    ],
  );
}

class _NoDetails extends StatelessWidget {
  const _NoDetails({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          Icon(
            Icons.inbox_outlined,
            size: 34,
            color: Theme.of(context).colorScheme.outline,
          ),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}

class _DetailError extends StatelessWidget {
  const _DetailError({this.error, required this.onRetry});

  final Object? error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final message = error is ApiException
        ? (error as ApiException).message
        : 'Không thể tải dữ liệu chi tiết.';
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, size: 48),
            const SizedBox(height: 12),
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Thử lại'),
            ),
          ],
        ),
      ),
    );
  }
}

String _number(double value) => value.toStringAsFixed(2);

String _date(DateTime value) {
  final local = value.toLocal();
  return '${local.day.toString().padLeft(2, '0')}/${local.month.toString().padLeft(2, '0')}/${local.year}';
}
