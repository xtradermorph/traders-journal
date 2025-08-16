-- Create Chat Tables
-- This script creates the missing chat tables that are referenced in the schema

-- Create chat_groups table
CREATE TABLE IF NOT EXISTS chat_groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    is_direct BOOLEAN DEFAULT false,
    creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create chat_group_members table
CREATE TABLE IF NOT EXISTS chat_group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    last_read_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    is_pinned BOOLEAN DEFAULT false,
    is_muted BOOLEAN DEFAULT false,
    UNIQUE(group_id, user_id)
);

-- Create chat_group_invitations table
CREATE TABLE IF NOT EXISTS chat_group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    inviter_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    invitee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(group_id, invitee_id)
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES chat_groups(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'file')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_group_members_group_id ON chat_group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_members_user_id ON chat_group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_invitations_group_id ON chat_group_invitations(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_group_invitations_invitee_id ON chat_group_invitations(invitee_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_group_id ON chat_messages(group_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Enable Row Level Security (RLS)
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_group_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for chat_groups
CREATE POLICY "Users can view groups they are members of" ON chat_groups
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_groups.id 
            AND chat_group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create groups" ON chat_groups
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Group creators can update their groups" ON chat_groups
    FOR UPDATE USING (auth.uid() = creator_id);

-- Create RLS policies for chat_group_members
CREATE POLICY "Group members can view group members" ON chat_group_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_group_members.group_id 
            AND chat_group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Group creators can add members" ON chat_group_members
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_groups 
            WHERE chat_groups.id = chat_group_members.group_id 
            AND chat_groups.creator_id = auth.uid()
        )
    );

-- Create RLS policies for chat_group_invitations
CREATE POLICY "Users can view invitations sent to them" ON chat_group_invitations
    FOR SELECT USING (auth.uid() = invitee_id);

CREATE POLICY "Group members can send invitations" ON chat_group_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_group_invitations.group_id 
            AND chat_group_members.user_id = auth.uid()
        )
    );

-- Create RLS policies for chat_messages
CREATE POLICY "Group members can view messages" ON chat_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_messages.group_id 
            AND chat_group_members.user_id = auth.uid()
        )
    );

CREATE POLICY "Group members can send messages" ON chat_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_group_members 
            WHERE chat_group_members.group_id = chat_messages.group_id 
            AND chat_group_members.user_id = auth.uid()
        )
    );

-- Verify tables were created
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('chat_groups', 'chat_group_members', 'chat_group_invitations', 'chat_messages')
ORDER BY table_name;
