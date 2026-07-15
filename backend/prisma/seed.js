import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || "admin@example.com";
  const password = process.env.SEED_ADMIN_PASSWORD || "Admin@12345";

  await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      username: email,
      passwordHash: await hashPassword(password),
      firstName: "Institute",
      lastName: "Admin",
      role: "ADMIN",
      status: "ACTIVE",
    },
  });

  const subject = await prisma.subject.upsert({
    where: { name: "Frontend" },
    update: {},
    create: {
      name: "Frontend",
      description: "Frontend fundamentals and React learning path.",
      icon: "Monitor",
      order: 1,
      phases: {
        create: {
          title: "Foundation",
          description: "Core web platform concepts.",
          displayOrder: 1,
          modules: {
            create: {
              title: "HTML Basics",
              description: "Understand semantic HTML and document structure.",
              displayOrder: 1,
              learningMaterials: {
                create: [
                  {
                    title: "HTML Introduction",
                    type: "ARTICLE",
                    contentUrl: "https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML",
                    estimatedMinutes: 30,
                    displayOrder: 1,
                  },
                  {
                    title: "Semantic HTML Practice",
                    type: "MARKDOWN",
                    contentUrl: "internal://materials/html-practice",
                    estimatedMinutes: 45,
                    displayOrder: 2,
                  },
                ],
              },
            },
          },
        },
      },
    },
  });

  console.log(`Seeded admin ${email} and subject ${subject.name}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
