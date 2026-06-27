-- AlterTable: add unique constraint on McpServer.name
ALTER TABLE "McpServer" ADD CONSTRAINT "McpServer_name_key" UNIQUE ("name");
