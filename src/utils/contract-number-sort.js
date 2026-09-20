const getContractNumberParts = (value) => {
  const raw = value == null ? "" : String(value).trim();
  const match = raw.match(/\d+/);

  return {
    raw,
    number: match ? Number(match[0]) : Number.POSITIVE_INFINITY,
  };
};

const compareText = (left, right) =>
  String(left || "").localeCompare(String(right || ""), "vi", {
    sensitivity: "base",
  });

const compareContractNumbers = (left, right) => {
  const leftParts = getContractNumberParts(left?.SoHopDong);
  const rightParts = getContractNumberParts(right?.SoHopDong);

  if (leftParts.number !== rightParts.number) {
    return leftParts.number - rightParts.number;
  }

  const contractCompare = compareText(leftParts.raw, rightParts.raw);
  if (contractCompare !== 0) return contractCompare;

  const nameCompare = compareText(left?.HoTen, right?.HoTen);
  if (nameCompare !== 0) return nameCompare;

  return compareText(left?.CCCD, right?.CCCD);
};

const sortByContractNumber = (records = []) =>
  [...records].sort(compareContractNumbers);

module.exports = {
  compareContractNumbers,
  sortByContractNumber,
};
