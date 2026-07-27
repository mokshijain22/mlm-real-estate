import { Link, useParams } from "react-router-dom";

function PlotMapper() {
  const { id } = useParams();

  return (
    <div className="d-flex flex-column" style={{ minHeight: "calc(100vh - 130px)" }}>
      <div className="page-title-box d-flex align-items-center justify-content-between mb-3">
        <div>
          <h4 className="page-title mb-1">
            <iconify-icon icon="solar:map-point-wave-bold-duotone" className="me-2 fs-22 text-primary align-middle"></iconify-icon>
            Advanced Plot Mapper
          </h4>
          <p className="text-muted mb-0">Create and manage a visual plot layout.</p>
        </div>
        <Link to={`/admin/projects/${id}/map`} className="btn btn-light">
          <iconify-icon icon="solar:arrow-left-linear" className="align-middle me-1"></iconify-icon>
          Back to Project Map
        </Link>
      </div>

      <div className="card shadow-sm border-0 flex-grow-1 mb-0">
        <div className="card-body p-0">
          <iframe
            title="Advanced Plot Mapper"
            src="/plot-mapper-local.html"
            className="border-0 w-100"
            style={{ minHeight: "calc(100vh - 235px)", display: "block" }}
          />
        </div>
      </div>
    </div>
  );
}

export default PlotMapper;
