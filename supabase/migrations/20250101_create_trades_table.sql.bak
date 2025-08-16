-- Create trades table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    currency_pair TEXT NOT NULL,
    trade_type TEXT NOT NULL CHECK (trade_type IN ('LONG', 'SHORT')),
    entry_price DOUBLE PRECISION NOT NULL,
    exit_price DOUBLE PRECISION NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE NOT NULL,
    exit_time TIMESTAMP WITH TIME ZONE NOT NULL,
    duration INTEGER NOT NULL, -- Duration in minutes
    pips DOUBLE PRECISION, -- Calculated based on entry and exit prices
    lot_size DOUBLE PRECISION NOT NULL,
    profit_loss DOUBLE PRECISION NOT NULL,
    date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_date ON public.trades(date);
CREATE INDEX IF NOT EXISTS idx_trades_created_at ON public.trades(created_at);

-- Enable Row Level Security
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for trades table
-- Users can select their own trades
CREATE POLICY "Allow users to select their own trades" ON public.trades
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own trades
CREATE POLICY "Allow users to insert their own trades" ON public.trades
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own trades
CREATE POLICY "Allow users to update their own trades" ON public.trades
    FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own trades
CREATE POLICY "Allow users to delete their own trades" ON public.trades
    FOR DELETE USING (auth.uid() = user_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_trades_updated_at 
    BEFORE UPDATE ON public.trades 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column(); 