/*
  Warnings:

  - A unique constraint covering the columns `[isbn]` on the table `books` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[googleBooksId]` on the table `books` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "books" ADD COLUMN     "googleBooksId" TEXT,
ADD COLUMN     "isbn" TEXT;

-- AlterTable
ALTER TABLE "user_books" ADD COLUMN     "currentChapter" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "currentPage" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rating" INTEGER,
ADD COLUMN     "review" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "books_isbn_key" ON "books"("isbn");

-- CreateIndex
CREATE UNIQUE INDEX "books_googleBooksId_key" ON "books"("googleBooksId");
