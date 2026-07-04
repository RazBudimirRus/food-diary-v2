import { storage } from "../storage";

export class AuditRepository {
  addAuditLog(data: Parameters<typeof storage.addAuditLog>[0]) {
    return storage.addAuditLog(data);
  }
  getAuditLog(filters: Parameters<typeof storage.getAuditLog>[0]) {
    return storage.getAuditLog(filters);
  }
}

export const auditRepository = new AuditRepository();
