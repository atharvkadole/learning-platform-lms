import { prisma } from "../../config/prisma.js";
import { getPagination } from "../../utils/pagination.js";
import { hashPassword } from "../../utils/password.js";

const studentInclude = {
  studentProfile: {
    include: {
      subjects: {
        include: { subject: true },
        orderBy: { assignedAt: "desc" },
      },
    },
  },
};

function toStudent(user) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    status: user.status,
    enrollmentDate: user.studentProfile?.enrollmentDate,
    averageScore: user.studentProfile?.averageScore ?? 0,
    subjects: user.studentProfile?.subjects?.map((item) => item.subject) ?? [],
    createdAt: user.createdAt,
  };
}

export async function listStudents(query) {
  const { page, limit, skip } = getPagination(query);
  const where = {
    role: "STUDENT",
    ...(query.status ? { status: query.status } : {}),
    ...(query.search
      ? {
          OR: [
            { firstName: { contains: query.search, mode: "insensitive" } },
            { lastName: { contains: query.search, mode: "insensitive" } },
            { email: { contains: query.search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      include: studentInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    data: users.map(toStudent),
    meta: { page, limit, total },
  };
}

export async function createStudent(input) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email.toLowerCase(),
        username: input.username || input.email.toLowerCase(),
        passwordHash: await hashPassword(input.password),
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        status: input.status,
        role: "STUDENT",
        studentProfile: {
          create: {
            enrollmentDate: input.enrollmentDate,
          },
        },
      },
      include: { studentProfile: true },
    });

    if (input.subjectIds.length) {
      await tx.studentSubject.createMany({
        data: input.subjectIds.map((subjectId) => ({
          studentId: user.studentProfile.id,
          subjectId,
        })),
        skipDuplicates: true,
      });
    }

    const created = await tx.user.findUnique({ where: { id: user.id }, include: studentInclude });
    return toStudent(created);
  });
}

export async function getStudent(id) {
  const user = await prisma.user.findFirstOrThrow({
    where: { id, role: "STUDENT" },
    include: studentInclude,
  });
  return toStudent(user);
}

export async function updateStudent(id, input) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id },
      data: {
        email: input.email?.toLowerCase(),
        username: input.username,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        status: input.status,
      },
      include: { studentProfile: true },
    });

    if (input.subjectIds) {
      await tx.studentSubject.deleteMany({ where: { studentId: user.studentProfile.id } });
      if (input.subjectIds.length) {
        await tx.studentSubject.createMany({
          data: input.subjectIds.map((subjectId) => ({ studentId: user.studentProfile.id, subjectId })),
          skipDuplicates: true,
        });
      }
    }

    const updated = await tx.user.findUnique({ where: { id }, include: studentInclude });
    return toStudent(updated);
  });
}

export async function deleteStudent(id) {
  await prisma.user.delete({ where: { id } });
}
