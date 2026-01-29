# What is Prisma?
Prisma is a type safe ORM which acts a middleware between your database and application. Prisma not only eliminates manual query writing where you have full control but raises issues like manual connection handling, repetitive boiler plate, etc. it even eliminates problems from traditional ORMs (which as discussed below).
## Now you may ask, what is even an ORM?
An **Object Relational Mapper (ORM)** acts as a translator or a middleware between two difference languages which helps you focus on building your application rather than worrying about writing efficient SQL queries, handling connection manually and repetitive query.

But traditional ORMs has tradeoffs too, which is why developers prefer prisma over other ORMs.
# How prisma is better than other ORMs?
Traditional ORMs lets you define your application models as classes, these classes are then mapped to table, which is good because it eliminates the hassle of writing query every time, messing up column names. But it comes with a catch, your ORM model uses object but SQL uses tables, this different representation of data is often referred to as "**object-relational impedance mismatch**" which raises problem like 
1. one object might contain other objects, but in SQL you need to perform multiple joins of tables. 
2. object has concept of inheritance but in SQL we have to create one giant table
3. relationships are directional with objects but for SQL its bidirectional so you need to map these foreign keys back into object references.
These all are not a problem for a developer but under the hood  the ORM performs multiple JOINs which can slow down the application performance and raise **n+1 problem** (hitting the database 100 times for 100 items).
Prisma solves this problem by using **schema**(which they refer to as "single source of truth") as middleware between your database and application, which eliminates **object-relational impedance mismatch**, it generates a TypeScript client specifically for your database and even executes query in batches (which eliminates the n+1 problem) and writes an efficient query.
## How Prisma got even better than before (^6.0.0)
Previously prisma used Rust based query engine as middleware between your database and application, which used to be bundled with Rust binaries.
But later prisma(from version 6) ditched Rust and rebuilt itself with Typescript/WASM compiler, which might sound like a downgrade in performance because Rust is considered fast, but getting rid of Rust not only removed the Rust binary overhead, it got up to 3.4x faster query(by removing cross language serialization) and a 90% smaller bundle size (from ~14mb to 1.6mb) which is a drastic change for both performance and size.

# About Prisma
To interact with prisma project, first install **Prisma CLI** which initialize new project, generate prisma client and analyze existing databse.
Run this command on your project to download Prisma CLI (use your desired package manager if you aren't using npm):
```Shell
npm install prisma --save-dev
npx prisma
npm install @prisma/client
```

**Prisma mainly depends on these three concepts:**
## Prisma Schema
This is the main configuration file for prisma setup, here we define 
- the data source (PostgreSQL or MoongoDB)
- generators, which specify the config for generating prisma client and output directory
- data model definition, which specify your application model and generate the prisma client based on that.
```Shell
// In case you want to use PostgresSQL
npm install @prisma/adapter-pg pg dotenv
npx prisma init --db
```
Here is an example of a prisma schema file:
```tsx
// generator determines which assets are created
generator client {
    provider = "prisma-client"
    // generated client output directory
    output   = "../lib/generated/prisma"
}

// data source
datasource db {
    provider = "postgresql"
    // url is depriciated, now you can put database URL in your .env file 
    // and prisma will automatically add it for you (given that dotenv is configured in your prisma.config file)
}

// data enum
enum Role {
    USER
    ADMIN
}

// data models
model User {
    id              String     @id @default(cuid())
    name            String     @map("full_name")
    role            Role       @default(USER)
    posts           Posts[]
    @@map("users") 
}
// @@map maps the 'User' object to the "users" table in the underlying database.
// @map maps the 'name' field to "full_name" column in the underlying database.

model Post {
  id        Int      @id @default(cuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  published Boolean  @default(false)
  title     String   @db.VarChar(255)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
}
// @id defines primary key, @default(cuid()) gives each id an unique value
```
For more information in field types, modifiers, and attributes visit [Official Document Page.](https://www.prisma.io/docs/orm/prisma-schema/data-model/models)
## Prisma Client
This is the auto-generated(based on schema file), type-safe query builder which is used in your application. It allows you to read and write data from your database using plain JavaScript and TypeScript objects.
This command below will generate the prisma client based on your schema file.
```shell
npx prisma generate
```
After prisma client is generated, 
1. Import prisma client in your application (for driver adapter not edge)
```tsx
import {PrismaClient} from "../lib/generated/prisma/client"
// import it from your specified output location in prisma generator(schema file)
import { PrismaPg } from "@prisma/adapter-pg";
// import PostgresSQL driver adapter

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({adapter});
```
2. Insert user data to database
```tsx
prisma.user.create({
	data: {
		name: "Soumik",
		posts: {
			create:{
				title: "About Prisma",
				published: true,
			},
		},
	},
});
```
3. Get post from database
```tsx
const userPost = prisma.post.findMany({
	where:{published:true},
})
```
## Prisma Migrate
Now, in case you want to change your schema file by adding new columns or maybe new table or changing any attribute or property, prisma migrate will help you update your database while also keeping a history of it (like git does).
Make sure you initialize once at first:
```Shell
npx prisma migrate dev --name init
```
Lets say you add another field to your schema
```tsx
model User {
    id              String     @id @default(cuid())
    name            String     @map("full_name")
    email           String?    @unique  // new field added
    role            Role       @default(USER)
    posts           Posts[]
    @@map("users") 
}
```
In order to update(add email) to your database you have to run:
```Shell
npx prisma migrate dev --name added_email
```
This will generate a migration folder(path configured in prisma.config.ts file) and generates a `.sql` file which runs to update your underlying database.

Originally `prisma db push` works as well, but it doesnt keep a history of change which can be a problem in production or in collaboration.

## Prisma Studio
Which isn't a core functionality in prisma but it's useful since its a GUI(Graphical User Interface) for viewing and editing data. There isn't much to talk about it, but you can find it in Studio tab in your [Prisma Console](https://console.prisma.io/?), and if you are using VS Code you can install the Prisma VS Code extension as well.

For in-depth information you can follow prisma official document [here](https://www.prisma.io/docs/getting-started)
**NOTE:** I have used npm as example, you can use pnpm, yarn, or bun as per your requirements. Here is how you can use them [Link](https://www.prisma.io/docs/orm/tools/prisma-cli#pnpm)