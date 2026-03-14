const {
  NCKH_TYPE_OPTIONS,
  resolveSelectedType,
  getTypeByValue,
} = require("../../config/nckh_v3/types");

const buildPageViewModel = (req, pageMode) => {
  const requestedType = String(req.query.type || "").trim();
  const selectedType = resolveSelectedType(requestedType);
  const selectedTypeMeta = getTypeByValue(selectedType);
  const pagePath = `${req.baseUrl}${req.path}`;

  return {
    requestedType,
    selectedType,
    selectedTypeMeta,
    pagePath,
    pageMode,
    inputPageUrl: `/v3/nckh/them-moi-nckh?type=${selectedType}`,
    listPageUrl: `/v3/nckh/xem-chung`,
  };
};

const renderWithMode = (req, res, pageMode) => {
  const viewModel = buildPageViewModel(req, pageMode);

  if (!viewModel.requestedType) {
    return res.redirect(`${viewModel.pagePath}?type=${viewModel.selectedType}`);
  }

  res.render("nckh_v3/index.ejs", {
    nckhTypeOptions: NCKH_TYPE_OPTIONS,
    selectedType: viewModel.selectedType,
    selectedTypeMeta: viewModel.selectedTypeMeta,
    pageMode: viewModel.pageMode,
    pagePath: viewModel.pagePath,
    inputPageUrl: viewModel.inputPageUrl,
    listPageUrl: viewModel.listPageUrl,
  });
};

const renderPage = (req, res) => {
  res.redirect("/v3/nckh/them-moi-nckh?type=de-tai-du-an");
};

const renderInputPage = (req, res) => renderWithMode(req, res, "input");
const renderUnifiedListPage = (_req, res) => {
  res.render("nckh_v3/list.ejs");
};

module.exports = {
  renderPage,
  renderInputPage,
  renderUnifiedListPage,
};
