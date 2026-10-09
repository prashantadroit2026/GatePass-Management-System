-- Demo accounts for the GatePass frontend 'Instant Demo Login' section.
-- All demo passwords are 'password123'. Change them in production!
-- Applied with:  wrangler d1 execute <DB_NAME> --remote --file=d1/seed.sql

INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_active) VALUES
  ('4b3169e3-2139-47bf-84e4-70038cd65aa1', 'System Admin', 'admin@gatepass.com', 'pbkdf2_sha256$240000$fUKQulACq+mR6lFkLJFaCg==$ZYJICmWbcCs0e6oufN/ArAdhp8jUM9IL4ICRoX5FlXE=', 'admin', 1);
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_active) VALUES
  ('4b4aa5a3-5d6c-44cc-b672-2fd109e4ff96', 'HR Manager', 'hr@gatepass.com', 'pbkdf2_sha256$240000$uB/CrLnyCkpxjaYqNSkTUA==$KNOZ1XkGg+bZ/GLZZ4mVrqUoQyyLxnAz1NXNlu8W4yk=', 'hr', 1);
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_active) VALUES
  ('a5d8a13a-3bbb-4c18-b05d-e43655cb68a5', 'Demo Employee', 'employee@gatepass.com', 'pbkdf2_sha256$240000$20jer3/F7MaCSXDU/0RNdA==$Q/0Ymvn0iA4GqGx+uAy5t0TAR51aIzdRS6yfaRfsMlM=', 'employee', 1);
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_active) VALUES
  ('b1f6e416-0078-4205-9256-3ab294ee7ec3', 'Gate Security', 'security@gatepass.com', 'pbkdf2_sha256$240000$GiVN7qcfju6nNXF9WjiPlQ==$cLBHZeqX3aTwi3d17qwswAcufhstMNnIq/ow+ANHis4=', 'security', 1);
INSERT OR IGNORE INTO users (id, name, email, password_hash, role, is_active) VALUES
  ('5a61cfa5-0917-4f40-af5f-9cc096042946', 'Demo Vendor', 'vendor@gatepass.com', 'pbkdf2_sha256$240000$oZmqVc2eU6UW66D68uISVw==$KSrZkY23Vw+Ara+UrXG9wJvFSAdYkW8vbrNe/FJixro=', 'vendor', 1);
