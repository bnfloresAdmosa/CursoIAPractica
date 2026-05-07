BEGIN TRY

BEGIN TRAN;

-- CreateTable
CREATE TABLE [dbo].[priority] (
    [id] INT NOT NULL,
    [name] NVARCHAR(50) NOT NULL,
    [order] SMALLINT NOT NULL,
    CONSTRAINT [priority_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [priority_name_key] UNIQUE NONCLUSTERED ([name]),
    CONSTRAINT [priority_order_key] UNIQUE NONCLUSTERED ([order])
);

-- CreateTable
CREATE TABLE [dbo].[tag] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(50) NOT NULL,
    [color] VARCHAR(7) NOT NULL,
    CONSTRAINT [tag_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [tag_name_key] UNIQUE NONCLUSTERED ([name])
);

-- CreateTable
CREATE TABLE [dbo].[user] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [email] NVARCHAR(255) NOT NULL,
    [password_hash] NVARCHAR(255) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [user_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [user_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [user_email_key] UNIQUE NONCLUSTERED ([email])
);

-- CreateTable
CREATE TABLE [dbo].[project] (
    [id] INT NOT NULL IDENTITY(1,1),
    [name] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [archived_at] DATETIME2,
    [created_by] INT NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [project_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [project_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[project_member] (
    [user_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [role] NVARCHAR(10) NOT NULL,
    [added_at] DATETIME2 NOT NULL CONSTRAINT [project_member_added_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [project_member_pkey] PRIMARY KEY CLUSTERED ([user_id],[project_id])
);

-- CreateTable
CREATE TABLE [dbo].[ticket] (
    [id] INT NOT NULL IDENTITY(1,1),
    [title] NVARCHAR(255) NOT NULL,
    [description] NVARCHAR(max),
    [status] NVARCHAR(20) NOT NULL CONSTRAINT [ticket_status_df] DEFAULT 'Por hacer',
    [priority_id] INT NOT NULL,
    [project_id] INT NOT NULL,
    [created_by] INT NOT NULL,
    [archived_at] DATETIME2,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [ticket_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    CONSTRAINT [ticket_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ticket_assignee] (
    [ticket_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [assigned_at] DATETIME2 NOT NULL CONSTRAINT [ticket_assignee_assigned_at_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [ticket_assignee_pkey] PRIMARY KEY CLUSTERED ([ticket_id],[user_id])
);

-- CreateTable
CREATE TABLE [dbo].[ticket_tag] (
    [ticket_id] INT NOT NULL,
    [tag_id] INT NOT NULL,
    CONSTRAINT [ticket_tag_pkey] PRIMARY KEY CLUSTERED ([ticket_id],[tag_id])
);

-- CreateTable
CREATE TABLE [dbo].[comment] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticket_id] INT NOT NULL,
    [user_id] INT NOT NULL,
    [body] NVARCHAR(max) NOT NULL,
    [created_at] DATETIME2 NOT NULL CONSTRAINT [comment_created_at_df] DEFAULT CURRENT_TIMESTAMP,
    [updated_at] DATETIME2 NOT NULL,
    [deleted_at] DATETIME2,
    CONSTRAINT [comment_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[audit_log] (
    [id] INT NOT NULL IDENTITY(1,1),
    [ticket_id] INT NOT NULL,
    [field] NVARCHAR(50) NOT NULL,
    [old_value] NVARCHAR(255),
    [new_value] NVARCHAR(255) NOT NULL,
    [actor_id] INT NOT NULL,
    [timestamp] DATETIME2 NOT NULL CONSTRAINT [audit_log_timestamp_df] DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT [audit_log_pkey] PRIMARY KEY CLUSTERED ([id])
);

-- CreateTable
CREATE TABLE [dbo].[ticket_lock] (
    [ticket_id] INT NOT NULL,
    [locked_by] INT NOT NULL,
    [locked_at] DATETIME2 NOT NULL CONSTRAINT [ticket_lock_locked_at_df] DEFAULT CURRENT_TIMESTAMP,
    [expires_at] DATETIME2 NOT NULL,
    CONSTRAINT [ticket_lock_pkey] PRIMARY KEY CLUSTERED ([ticket_id])
);

-- CreateTable
CREATE TABLE [dbo].[refresh_token] (
    [id] INT NOT NULL IDENTITY(1,1),
    [user_id] INT NOT NULL,
    [token_hash] NVARCHAR(255) NOT NULL,
    [issued_at] DATETIME2 NOT NULL CONSTRAINT [refresh_token_issued_at_df] DEFAULT CURRENT_TIMESTAMP,
    [expires_at] DATETIME2 NOT NULL,
    [consumed_at] DATETIME2,
    [replaced_by_id] INT,
    [revoked_at] DATETIME2,
    CONSTRAINT [refresh_token_pkey] PRIMARY KEY CLUSTERED ([id]),
    CONSTRAINT [refresh_token_token_hash_key] UNIQUE NONCLUSTERED ([token_hash])
);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_tag_name] ON [dbo].[tag]([name]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_user_email] ON [dbo].[user]([email]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_project_archived_at] ON [dbo].[project]([archived_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_project_created_by] ON [dbo].[project]([created_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_pm_project_role] ON [dbo].[project_member]([project_id], [role]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_pm_user] ON [dbo].[project_member]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_ticket_project_archived_status] ON [dbo].[ticket]([project_id], [archived_at], [status]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_ticket_project_priority] ON [dbo].[ticket]([project_id], [priority_id], [archived_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_ticket_created_by] ON [dbo].[ticket]([created_by]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_ta_user] ON [dbo].[ticket_assignee]([user_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_tt_tag] ON [dbo].[ticket_tag]([tag_id]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_comment_ticket_active] ON [dbo].[comment]([ticket_id], [deleted_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_audit_ticket_time] ON [dbo].[audit_log]([ticket_id], [timestamp] DESC);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_audit_field_value_time] ON [dbo].[audit_log]([field], [new_value], [timestamp]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_lock_expires] ON [dbo].[ticket_lock]([expires_at]);

-- CreateIndex
CREATE NONCLUSTERED INDEX [ix_refresh_user_active] ON [dbo].[refresh_token]([user_id], [expires_at]);

-- AddForeignKey
ALTER TABLE [dbo].[project] ADD CONSTRAINT [project_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_member] ADD CONSTRAINT [project_member_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[project_member] ADD CONSTRAINT [project_member_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket] ADD CONSTRAINT [ticket_priority_id_fkey] FOREIGN KEY ([priority_id]) REFERENCES [dbo].[priority]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket] ADD CONSTRAINT [ticket_project_id_fkey] FOREIGN KEY ([project_id]) REFERENCES [dbo].[project]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket] ADD CONSTRAINT [ticket_created_by_fkey] FOREIGN KEY ([created_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket_assignee] ADD CONSTRAINT [ticket_assignee_ticket_id_fkey] FOREIGN KEY ([ticket_id]) REFERENCES [dbo].[ticket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket_assignee] ADD CONSTRAINT [ticket_assignee_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket_tag] ADD CONSTRAINT [ticket_tag_ticket_id_fkey] FOREIGN KEY ([ticket_id]) REFERENCES [dbo].[ticket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket_tag] ADD CONSTRAINT [ticket_tag_tag_id_fkey] FOREIGN KEY ([tag_id]) REFERENCES [dbo].[tag]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[comment] ADD CONSTRAINT [comment_ticket_id_fkey] FOREIGN KEY ([ticket_id]) REFERENCES [dbo].[ticket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[comment] ADD CONSTRAINT [comment_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_log] ADD CONSTRAINT [audit_log_ticket_id_fkey] FOREIGN KEY ([ticket_id]) REFERENCES [dbo].[ticket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[audit_log] ADD CONSTRAINT [audit_log_actor_id_fkey] FOREIGN KEY ([actor_id]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket_lock] ADD CONSTRAINT [ticket_lock_ticket_id_fkey] FOREIGN KEY ([ticket_id]) REFERENCES [dbo].[ticket]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[ticket_lock] ADD CONSTRAINT [ticket_lock_locked_by_fkey] FOREIGN KEY ([locked_by]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[refresh_token] ADD CONSTRAINT [refresh_token_user_id_fkey] FOREIGN KEY ([user_id]) REFERENCES [dbo].[user]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE [dbo].[refresh_token] ADD CONSTRAINT [refresh_token_replaced_by_id_fkey] FOREIGN KEY ([replaced_by_id]) REFERENCES [dbo].[refresh_token]([id]) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- CHECK constraints (no expresables nativamente en Prisma SQL Server connector)
-- Defensa adicional al validation Zod en handlers (database-schema.yaml).
ALTER TABLE [dbo].[ticket] ADD CONSTRAINT [ck_ticket_status]
    CHECK ([status] IN ('Por hacer', 'En progreso', 'Listo'));
ALTER TABLE [dbo].[project_member] ADD CONSTRAINT [ck_project_member_role]
    CHECK ([role] IN ('ADMIN', 'USER'));

COMMIT TRAN;

END TRY
BEGIN CATCH

IF @@TRANCOUNT > 0
BEGIN
    ROLLBACK TRAN;
END;
THROW

END CATCH
