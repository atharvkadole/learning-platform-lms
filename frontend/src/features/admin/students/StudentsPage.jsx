import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit2, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "../../../components/ui/Button.jsx";
import { Card, CardHeader } from "../../../components/ui/Card.jsx";
import { Field, Input, Select } from "../../../components/ui/Field.jsx";
import { EmptyState } from "../../../components/ui/Page.jsx";
import { StatusBadge } from "../../../components/ui/StatusBadge.jsx";
import { api } from "../../../lib/api.js";

const schema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email"),
  phone: z.string().optional(),
  password: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]),
  subjectIds: z.array(z.string()).default([]),
});

const defaultValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "Student@12345",
  status: "ACTIVE",
  subjectIds: [],
};

function StudentRecord({ student, onEdit, onDelete }) {
  const subjectNames = student.subjects?.map((subject) => subject.name) || [];

  return (
    <article className="rounded-2xl border border-slate-200 bg-white/70 p-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-slate-950">
            {student.firstName} {student.lastName}
          </p>
          <p className="mt-1 truncate text-sm text-slate-500">
            {student.email}
          </p>
        </div>
        <StatusBadge value={student.status} />
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_104px] lg:items-start">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assigned Subjects
          </p>
          {subjectNames.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {subjectNames.map((name) => (
                <span
                  key={name}
                  className="max-w-full truncate rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                >
                  {name}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-slate-500">No subjects assigned</p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-center">
          <p className="text-lg font-semibold text-slate-950">
            {Math.round(student.averageScore || 0)}%
          </p>
          <p className="text-xs text-slate-500">Average</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" className="h-9 px-3" onClick={onEdit}>
          <Edit2 size={15} />
          Edit
        </Button>
        <Button variant="danger" className="h-9 px-3" onClick={onDelete}>
          <Trash2 size={15} />
          Delete
        </Button>
      </div>
    </article>
  );
}

export function StudentsPage() {
  const [editingStudent, setEditingStudent] = useState(null);
  const [addStudent, setAddStudent] = useState(false);
  const queryClient = useQueryClient();

  const students = useQuery({
    queryKey: ["students"],
    queryFn: async () => (await api.get("/admin/students?limit=100")).data.data,
  });

  const subjects = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => (await api.get("/admin/subjects?limit=100")).data.data,
  });

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const saveStudent = useMutation({
    mutationFn: (values) => {
      if (editingStudent) {
        const { password: _password, ...payload } = values;
        return api.patch(`/admin/students/${editingStudent.id}`, payload);
      }
      return api.post("/admin/students", {
        ...values,
        password: values.password || "Student@12345",
      });
    },
    onSuccess: () => {
      toast.success(editingStudent ? "Student updated" : "Student created");
      cancelEdit();
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not save student"),
  });

  const deleteStudent = useMutation({
    mutationFn: (studentId) => api.delete(`/admin/students/${studentId}`),
    onSuccess: () => {
      toast.success("Student deleted");
      cancelEdit();
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
    onError: (error) =>
      toast.error(error.response?.data?.message || "Could not delete student"),
  });

  function startEdit(student) {
    setEditingStudent(student);
    form.reset({
      firstName: student.firstName || "",
      lastName: student.lastName || "",
      email: student.email || "",
      phone: student.phone || "",
      password: "",
      status: student.status || "ACTIVE",
      subjectIds: student.subjects?.map((subject) => subject.id) || [],
    });
  }

  function cancelEdit() {
    setEditingStudent(null);
    form.reset(defaultValues);
  }

  function confirmDelete(student) {
    const ok = window.confirm(
      `Delete ${student.firstName} ${student.lastName}? This cannot be undone.`,
    );
    if (ok) deleteStudent.mutate(student.id);
  }

  return (
    // <div className="grid gap-6 xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]">
    <div
      className={`grid gap-6 ${
        addStudent
          ? "xl:grid-cols-[minmax(0,480px)_minmax(0,1fr)]"
          : "grid-cols-1"
      }`}
    >
      <Card>
        <Button
          variant={addStudent ? "secondary" : "primary"}
          onClick={() => setAddStudent(!addStudent)}
          className="mb-4"
        >
          {addStudent? "close" : "Add Student"}
        </Button>
        <CardHeader
          title="Students"
          description="Read, update, delete, and review subject assignments."
        />
        <div className="grid gap-3">
          {(students.data || []).map((student) => (
            <StudentRecord
              key={student.id}
              student={student}
              onEdit={() => startEdit(student)}
              onDelete={() => confirmDelete(student)}
            />
          ))}

          {!students.isLoading && !(students.data || []).length ? (
            <EmptyState
              title="No students yet"
              description="Create the first student, then assign one or more subjects."
            />
          ) : null}
        </div>
      </Card>
      {addStudent ? (
        <Card className="self-start">
          <CardHeader
            title={editingStudent ? "Edit Student" : "Create Student"}
            description="Create accounts, update status, and attach subjects."
            action={
              editingStudent ? (
                <Button variant="ghost" onClick={cancelEdit}>
                  <X size={16} />
                  Cancel
                </Button>
              ) : null
            }
          />
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit((values) => saveStudent.mutate(values))}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="First Name"
                error={form.formState.errors.firstName?.message}
              >
                <Input {...form.register("firstName")} />
              </Field>
              <Field
                label="Last Name"
                error={form.formState.errors.lastName?.message}
              >
                <Input {...form.register("lastName")} />
              </Field>
            </div>

            <Field label="Email" error={form.formState.errors.email?.message}>
              <Input type="email" {...form.register("email")} />
            </Field>

            <Field label="Phone">
              <Input {...form.register("phone")} />
            </Field>

            {!editingStudent ? (
              <Field
                label="Initial Password"
                error={form.formState.errors.password?.message}
              >
                <Input {...form.register("password")} />
              </Field>
            ) : null}

            <Field label="Status">
              <Select {...form.register("status")}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">
                Assigned Subjects
              </p>
              <div className="max-h-56 space-y-2 overflow-auto rounded-md border border-slate-200 p-3">
                {(subjects.data || []).map((subject) => (
                  <label
                    key={subject.id}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <input
                      type="checkbox"
                      value={subject.id}
                      className="mt-1"
                      {...form.register("subjectIds")}
                    />
                    <span>
                      <span className="font-medium text-slate-900">
                        {subject.name}
                      </span>
                      {subject.description ? (
                        <span className="block text-xs text-slate-500">
                          {subject.description}
                        </span>
                      ) : null}
                    </span>
                  </label>
                ))}
                {!subjects.data?.length ? (
                  <p className="text-sm text-slate-500">
                    Create subjects before assigning them.
                  </p>
                ) : null}
              </div>
            </div>

            <Button type="submit" disabled={saveStudent.isPending}>
              {saveStudent.isPending
                ? "Saving"
                : editingStudent
                  ? "Update Student"
                  : "Create Student"}
            </Button>
          </form>
        </Card>
      ) : null}
    </div>
  );
}
