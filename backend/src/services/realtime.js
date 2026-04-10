let ioRef = null;

function initRealtime(io) {
  ioRef = io;
}

function emitToReseller(resellerId, event, payload) {
  if (!ioRef) return;
  ioRef.to(`reseller:${resellerId}`).emit(event, payload);
}

function emitToAdmins(event, payload) {
  if (!ioRef) return;
  ioRef.to('admins').emit(event, payload);
}

module.exports = { initRealtime, emitToReseller, emitToAdmins };

