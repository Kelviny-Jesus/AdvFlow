-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create cases table
CREATE TABLE public.cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  reference TEXT,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'closed', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create folders table (hierarchical structure)
CREATE TABLE public.folders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('client', 'case', 'subfolder')),
  path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create documents table
CREATE TABLE public.documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  doc_number TEXT,
  mime_type TEXT NOT NULL,
  size BIGINT NOT NULL DEFAULT 0,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'docx', 'image', 'audio', 'video', 'zip', 'other')),
  google_drive_id TEXT,
  supabase_storage_path TEXT,
  web_view_link TEXT,
  download_link TEXT,
  thumbnail_link TEXT,
  description TEXT,
  app_properties JSONB,
  status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('processing', 'completed', 'error')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create petitions table
CREATE TABLE public.petitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  template TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'final')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create petition_documents junction table
CREATE TABLE public.petition_documents (
  petition_id UUID NOT NULL REFERENCES public.petitions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  PRIMARY KEY (petition_id, document_id)
);

-- Create facts table
CREATE TABLE public.facts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  petition_id UUID NOT NULL REFERENCES public.petitions(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('contratual', 'processual', 'probatorio', 'comunicacao')),
  text TEXT NOT NULL,
  tags TEXT[],
  confidence DECIMAL(3,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create fact_documents junction table
CREATE TABLE public.fact_documents (
  fact_id UUID NOT NULL REFERENCES public.facts(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  PRIMARY KEY (fact_id, document_id)
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  naming_pattern TEXT NOT NULL DEFAULT '{client}_{case}_{seq:03d}_{date}',
  uppercase_client BOOLEAN NOT NULL DEFAULT true,
  use_underscores BOOLEAN NOT NULL DEFAULT true,
  seq_reset_per_client BOOLEAN NOT NULL DEFAULT false,
  date_format TEXT NOT NULL DEFAULT 'YYYY-MM-DD',
  petition_template TEXT,
  fact_categories TEXT[] NOT NULL DEFAULT ARRAY['contratual', 'processual', 'probatorio', 'comunicacao'],
  auto_extract_facts BOOLEAN NOT NULL DEFAULT true,
  classification_enabled BOOLEAN NOT NULL DEFAULT true,
  google_drive_connected BOOLEAN NOT NULL DEFAULT false,
  google_drive_last_sync TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create classification_rules table
CREATE TABLE public.classification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  match_pattern TEXT NOT NULL,
  document_type TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 0,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.petition_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classification_rules ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for clients
CREATE POLICY "Users can manage their own clients" 
ON public.clients 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for cases
CREATE POLICY "Users can manage their own cases" 
ON public.cases 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for folders
CREATE POLICY "Users can manage their own folders" 
ON public.folders 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for documents
CREATE POLICY "Users can manage their own documents" 
ON public.documents 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for petitions
CREATE POLICY "Users can manage their own petitions" 
ON public.petitions 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for petition_documents
CREATE POLICY "Users can manage their own petition documents" 
ON public.petition_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.petitions 
    WHERE petitions.id = petition_documents.petition_id 
    AND petitions.user_id = auth.uid()
  )
);

-- Create RLS policies for facts
CREATE POLICY "Users can manage their own facts" 
ON public.facts 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for fact_documents
CREATE POLICY "Users can manage their own fact documents" 
ON public.fact_documents 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.facts 
    WHERE facts.id = fact_documents.fact_id 
    AND facts.user_id = auth.uid()
  )
);

-- Create RLS policies for user_settings
CREATE POLICY "Users can manage their own settings" 
ON public.user_settings 
FOR ALL 
USING (auth.uid() = user_id);

-- Create RLS policies for classification_rules
CREATE POLICY "Users can manage their own classification rules" 
ON public.classification_rules 
FOR ALL 
USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_cases_client_id ON public.cases(client_id);
CREATE INDEX idx_folders_user_id ON public.folders(user_id);
CREATE INDEX idx_folders_parent_id ON public.folders(parent_id);
CREATE INDEX idx_documents_user_id ON public.documents(user_id);
CREATE INDEX idx_documents_client_id ON public.documents(client_id);
CREATE INDEX idx_documents_case_id ON public.documents(case_id);
CREATE INDEX idx_documents_folder_id ON public.documents(folder_id);
CREATE INDEX idx_petitions_user_id ON public.petitions(user_id);
CREATE INDEX idx_facts_user_id ON public.facts(user_id);
CREATE INDEX idx_facts_petition_id ON public.facts(petition_id);
CREATE INDEX idx_classification_rules_user_id ON public.classification_rules(user_id);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_folders_updated_at
  BEFORE UPDATE ON public.folders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_petitions_updated_at
  BEFORE UPDATE ON public.petitions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_classification_rules_updated_at
  BEFORE UPDATE ON public.classification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();