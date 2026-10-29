"use client";

import { useState } from "react";
import { changeUserRole } from "@/app/admin/actions";

type UserRecord = { id: string; name: string; role: "developer" | "admin" | "teacher" | "student"; email: string };

export function UserRoleManager({ users, canManageDevelopers = false }: { users: UserRecord[]; canManageDevelopers?: boolean }) {
  const [records, setRecords] = useState(users);
  const [message, setMessage] = useState<string | null>(null);

  async function updateRole(userId: string, role: UserRecord["role"]) {
    setMessage(null);
    const result = await changeUserRole(userId, role);
    if (result.error) {
      setMessage(result.error);
      return;
    }
    setRecords((current) => current.map((user) => user.id === userId ? { ...user, role } : user));
    setMessage("Role updated.");
  }

  return <div className="control-card user-manager"><div className="control-card-heading"><div><span className="section-kicker">Access control</span><h2>Users and roles</h2></div><span className="teacher-count">{records.length}</span></div>{message ? <p className={message === "Role updated." ? "control-success" : "control-error"} role="alert">{message}</p> : null}<div className="user-table">{records.map((user) => <div className="user-row" key={user.id}><div><strong>{user.name || "Unnamed user"}</strong><small>{user.email}</small></div><select value={user.role} onChange={(event) => updateRole(user.id, event.target.value as UserRecord["role"])} disabled={user.role === "developer" && !canManageDevelopers}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Admin</option>{canManageDevelopers ? <option value="developer">Developer</option> : null}</select></div>)}</div></div>;
}
