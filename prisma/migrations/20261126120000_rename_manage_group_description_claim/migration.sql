-- RenameEnumValue: Members who held MANAGE_GROUP_DESCRIPTION keep it under its new name.
ALTER TYPE "group_claim" RENAME VALUE 'MANAGE_GROUP_DESCRIPTION' TO 'MANAGE_GROUP_HOME';
