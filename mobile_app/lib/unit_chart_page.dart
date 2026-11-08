import 'dart:async';
import 'dart:math' as math;

import 'package:fl_chart/fl_chart.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'models/unit_statistics.dart';

/// Landscape-only visualisation of the aggregates already returned by the
/// unit dashboard APIs. No totals are recomputed in the mobile client.
class UnitChartPage extends StatefulWidget {
  const UnitChartPage({super.key, required this.dashboard});

  final UnitDashboard dashboard;

  @override
  State<UnitChartPage> createState() => _UnitChartPageState();
}

class _UnitChartPageState extends State<UnitChartPage> {
  @override
  void initState() {
    super.initState();
    unawaited(_setLandscape());
  }

  @override
  void dispose() {
    // The rest of the app is designed for portrait use.
    unawaited(_setPortrait());
    super.dispose();
  }

  Future<void> _setLandscape() => SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.landscapeLeft,
    DeviceOrientation.landscapeRight,
  ]);

  Future<void> _setPortrait() => SystemChrome.setPreferredOrientations(const [
    DeviceOrientation.portraitUp,
  ]);

  @override
  Widget build(BuildContext context) {
    final dashboard = widget.dashboard;
    final unitRows = dashboard.vuotGio.rows
        .where((row) => row.isUnitRow)
        .toList(growable: false);
    final lecturerRows = dashboard.vuotGio.rows
        .where((row) => !row.isUnitRow)
        .toList(growable: false);
    final chartRows = unitRows.isNotEmpty ? unitRows : lecturerRows;
    final vuotGioUnavailable = !dashboard.vuotGioAvailable || chartRows.isEmpty;
    final vuotGioChartTitle = unitRows.isNotEmpty
        ? 'Vượt Giờ theo đơn vị'
        : 'Vượt Giờ theo giảng viên';
    final sourceNote = _sourceNote(
      dashboard.scope,
      dashboard.vuotGioSource,
      dashboard.nckhSource,
    );

    return Scaffold(
      appBar: AppBar(
        title: const Text('Biểu đồ khoa/phòng'),
        actions: [
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Center(
              child: Text(
                '${dashboard.academicYear} · ${_scopeLabel(dashboard.scope)}',
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: OrientationBuilder(
          builder: (context, orientation) => SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (orientation == Orientation.portrait)
                  const _OrientationHint(),
                if (sourceNote != null) _SourceNote(message: sourceNote),
                if (vuotGioUnavailable)
                  const _UnavailableBanner(
                    message:
                        'Năm học chưa khóa; biểu đồ Vượt Giờ chưa khả dụng.',
                  ),
                // Keep the charts stacked vertically even in landscape. This
                // gives each chart enough horizontal room for unit labels and
                // makes the two data sets easier to scan and compare.
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    _ChartCard(
                      title: 'NCKH theo đơn vị',
                      subtitle: 'Tổng số tiết',
                      icon: Icons.science_outlined,
                      child: _UnitNckhChart(rows: dashboard.nckh),
                    ),
                    const SizedBox(height: 16),
                    _ChartCard(
                      title: vuotGioChartTitle,
                      subtitle: 'Thực hiện và vượt',
                      icon: Icons.bar_chart_rounded,
                      child: vuotGioUnavailable
                          ? const _UnavailableChart(
                              message:
                                  'Chưa có dữ liệu Vượt Giờ cho phạm vi này.',
                            )
                          : _UnitVuotGioChart(
                              rows: chartRows,
                              byUnit: unitRows.isNotEmpty,
                            ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _scopeLabel(String scope) => switch (scope) {
  'projected' => 'Dự kiến',
  _ => 'Chính thức',
};

String? _sourceNote(String scope, String vuotGioSource, String nckhSource) {
  final matches = scope == 'projected'
      ? (vuotGioSource == 'projected_live' ||
                vuotGioSource == 'preview_live') &&
            (nckhSource == 'projected_live' || nckhSource == 'preview_live')
      : vuotGioSource == 'snapshot' && nckhSource == 'official_live';
  if (matches) return null;
  return 'Nguồn hiệu lực: Vượt Giờ ${_sourceLabel(vuotGioSource)} · '
      'NCKH ${_sourceLabel(nckhSource)}.';
}

String _sourceLabel(String source) => switch (source) {
  'projected_live' || 'preview_live' => 'dự kiến live',
  'official_live' => 'chính thức live',
  'snapshot' => 'snapshot đã khóa',
  _ => source,
};

class _OrientationHint extends StatelessWidget {
  const _OrientationHint();

  @override
  Widget build(BuildContext context) => Card(
    color: Theme.of(context).colorScheme.secondaryContainer,
    child: const Padding(
      padding: EdgeInsets.all(12),
      child: Row(
        children: [
          Icon(Icons.screen_rotation_outlined),
          SizedBox(width: 10),
          Expanded(child: Text('Đang chuyển màn hình sang chế độ ngang...')),
        ],
      ),
    ),
  );
}

class _UnavailableBanner extends StatelessWidget {
  const _UnavailableBanner({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Card(
    color: Theme.of(context).colorScheme.errorContainer,
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          Icon(
            Icons.info_outline,
            color: Theme.of(context).colorScheme.onErrorContainer,
          ),
          const SizedBox(width: 10),
          Expanded(child: Text(message)),
        ],
      ),
    ),
  );
}

class _SourceNote extends StatelessWidget {
  const _SourceNote({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Card(
    color: Theme.of(context).colorScheme.surfaceContainerHighest,
    child: Padding(
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          const Icon(Icons.info_outline),
          const SizedBox(width: 10),
          Expanded(child: Text(message)),
        ],
      ),
    ),
  );
}

class _ChartCard extends StatelessWidget {
  const _ChartCard({
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.child,
  });

  final String title;
  final String subtitle;
  final IconData icon;
  final Widget child;

  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon),
              const SizedBox(width: 8),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium
                          ?.copyWith(fontWeight: FontWeight.bold),
                    ),
                    Text(subtitle),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    ),
  );
}

class _UnitNckhChart extends StatelessWidget {
  const _UnitNckhChart({required this.rows});

  final List<UnitNckhRow> rows;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return const _UnavailableChart(message: 'Chưa có dữ liệu.');
    }

    final values = rows.map((row) => row.totalHours).toList(growable: false);
    return SizedBox(
      height: 280,
      child: BarChart(
        _chartData(
          maxValue: values.fold<double>(0, math.max),
          groups: [
            for (var index = 0; index < rows.length; index++)
              BarChartGroupData(
                x: index,
                barRods: [
                  BarChartRodData(
                    toY: values[index],
                    color: const Color(0xff1d70b8),
                    width: 24,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ],
              ),
          ],
          labels: [
            for (final row in rows) _unitLabel(row.unitName, row.unitCode),
          ],
        ),
      ),
    );
  }
}

class _UnitVuotGioChart extends StatelessWidget {
  const _UnitVuotGioChart({required this.rows, required this.byUnit});

  final List<UnitVuotGioRow> rows;
  final bool byUnit;

  @override
  Widget build(BuildContext context) {
    if (rows.isEmpty) {
      return const _UnavailableChart(message: 'Chưa có dữ liệu.');
    }

    final maxValue = rows.fold<double>(
      0,
      (current, row) =>
          math.max(current, math.max(row.totalCompleted, row.totalOvertime)),
    );
    return SizedBox(
      height: 280,
      child: BarChart(
        _chartData(
          maxValue: maxValue,
          groups: [
            for (var index = 0; index < rows.length; index++)
              BarChartGroupData(
                x: index,
                barsSpace: 4,
                barRods: [
                  BarChartRodData(
                    toY: rows[index].totalCompleted,
                    color: const Color(0xff185abc),
                    width: 12,
                    borderRadius: BorderRadius.circular(3),
                  ),
                  BarChartRodData(
                    toY: rows[index].totalOvertime,
                    color: const Color(0xffe76f51),
                    width: 12,
                    borderRadius: BorderRadius.circular(3),
                  ),
                ],
              ),
          ],
          labels: [
            for (final row in rows)
              byUnit
                  ? _unitLabel(row.unitName, row.unitCode)
                  : _lecturerLabel(row.teacherName),
          ],
        ),
      ),
    );
  }
}

BarChartData _chartData({
  required double maxValue,
  required List<BarChartGroupData> groups,
  required List<String> labels,
}) {
  final chartMax = maxValue <= 0 ? 1.0 : maxValue * 1.15;
  return BarChartData(
    maxY: chartMax,
    minY: 0,
    barGroups: groups,
    alignment: BarChartAlignment.spaceAround,
    gridData: const FlGridData(show: true),
    borderData: FlBorderData(show: false),
    barTouchData: BarTouchData(enabled: true),
    titlesData: FlTitlesData(
      topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
      leftTitles: const AxisTitles(
        sideTitles: SideTitles(showTitles: true, reservedSize: 44),
      ),
      bottomTitles: AxisTitles(
        sideTitles: SideTitles(
          showTitles: true,
          reservedSize: 42,
          getTitlesWidget: (value, meta) {
            final index = value.toInt();
            if (index < 0 || index >= labels.length) {
              return const SizedBox.shrink();
            }
            return SideTitleWidget(
              axisSide: meta.axisSide,
              space: 8,
              child: SizedBox(
                width: 72,
                child: Text(
                  labels[index],
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontSize: 11),
                ),
              ),
            );
          },
        ),
      ),
    ),
  );
}

String _unitLabel(String? name, String? code) {
  final value = (code?.trim().isNotEmpty == true ? code : name) ?? 'Đơn vị';
  return value.length > 16 ? '${value.substring(0, 15)}…' : value;
}

String _lecturerLabel(String? name) {
  final value = name?.trim().isNotEmpty == true ? name!.trim() : 'Giảng viên';
  return value.length > 16 ? '${value.substring(0, 15)}…' : value;
}

class _UnavailableChart extends StatelessWidget {
  const _UnavailableChart({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 280,
    child: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.bar_chart_outlined, size: 42),
          const SizedBox(height: 8),
          Text(message, textAlign: TextAlign.center),
        ],
      ),
    ),
  );
}
