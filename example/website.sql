/*

 Source Server Type    : PostgreSQL
 Source Server Version : 110005
 Source Catalog        : gennerator
 Source Schema         : website

 Target Server Type    : PostgreSQL
 Target Server Version : 110005
 File Encoding         : 65001
 
*/


-- ----------------------------
-- Sequence structure for user_id_seq
-- ----------------------------
DROP SEQUENCE IF EXISTS "website"."user_id_seq";
CREATE SEQUENCE "website"."user_id_seq" 
INCREMENT 1
MINVALUE  1
MAXVALUE 36000
START 1
CACHE 1;

-- ----------------------------
-- Table structure for session
-- ----------------------------
DROP TABLE IF EXISTS "website"."session";
CREATE TABLE "website"."session" (
  "sid" varchar COLLATE "pg_catalog"."default" NOT NULL,
  "sess" json NOT NULL,
  "expire" timestamp(6) NOT NULL
)
;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS "website"."users";
CREATE TABLE "website"."users" (
  "user_id" int2 NOT NULL DEFAULT nextval('"website".user_id_seq'::regclass),
  "username" varchar(40) COLLATE "pg_catalog"."default" NOT NULL,
  "password" char(246) COLLATE "pg_catalog"."default" NOT NULL,
  "email" varchar(254) COLLATE "pg_catalog"."default" NOT NULL,
  "usertype" int2 NOT NULL DEFAULT 1,
  "active" bool NOT NULL DEFAULT false,
  "createdate" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastlogin" timestamptz(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
)
;

-- ----------------------------
-- Alter sequences owned by
-- ----------------------------
ALTER SEQUENCE "website"."user_id_seq"
OWNED BY "website"."users"."user_id";
SELECT setval('"website"."user_id_seq"', 1, true);

-- ----------------------------
-- Primary Key structure for table session
-- ----------------------------
ALTER TABLE "website"."session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid");

-- ----------------------------
-- Uniques structure for table users
-- ----------------------------
ALTER TABLE "website"."users" ADD CONSTRAINT "users_username_key" UNIQUE ("username");
ALTER TABLE "website"."users" ADD CONSTRAINT "users_email_key" UNIQUE ("email");

-- ----------------------------
-- Primary Key structure for table users
-- ----------------------------
ALTER TABLE "website"."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY ("user_id");
