// Currency formatting helpers for the TTCS dashboard.
//
// The compact form keeps KPI cards readable when payments reach millions or
// billions, while the exact form remains available for tooltips and the
// secondary value shown below a compact KPI.

String formatCurrencyExact(double value) {
  if (!value.isFinite) return '—';

  final rounded = value.round();
  final sign = rounded < 0 ? '-' : '';
  final digits = rounded.abs().toString();
  return '$sign${_groupThousands(digits)} đ';
}

String formatCurrencyCompact(double value) {
  if (!value.isFinite) return '—';

  final absolute = value.abs();
  final sign = value < 0 ? '-' : '';
  if (absolute >= 1e12) {
    return '$sign${_compactDecimal(absolute / 1e12)} nghìn tỷ đ';
  }
  if (absolute >= 1e9) {
    return '$sign${_compactDecimal(absolute / 1e9)} tỷ đ';
  }
  if (absolute >= 1e6) {
    return '$sign${_compactDecimal(absolute / 1e6)} triệu đ';
  }
  return formatCurrencyExact(value);
}

String _compactDecimal(double value) {
  final decimals = value >= 100
      ? 0
      : value >= 10
      ? 1
      : 2;
  var text = value.toStringAsFixed(decimals);
  if (text.contains('.')) {
    text = text.replaceFirst(RegExp(r'0+$'), '');
    text = text.replaceFirst(RegExp(r'\.$'), '');
  }
  return text.replaceAll('.', ',');
}

String _groupThousands(String digits) {
  final buffer = StringBuffer();
  for (var index = 0; index < digits.length; index++) {
    if (index > 0 && (digits.length - index) % 3 == 0) {
      buffer.write('.');
    }
    buffer.write(digits[index]);
  }
  return buffer.toString();
}
