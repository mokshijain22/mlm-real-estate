function NoAccess() {
  return (
    <div className="card border-0 shadow-sm">
      <div className="card-body text-center py-5">
        <iconify-icon icon="solar:lock-keyhole-bold-duotone" className="fs-48 text-muted"></iconify-icon>
        <h4 className="fw-bold mt-3">No access assigned</h4>
        <p className="text-muted mb-0">Please contact the super admin to assign the modules you need.</p>
      </div>
    </div>
  );
}

export default NoAccess;
