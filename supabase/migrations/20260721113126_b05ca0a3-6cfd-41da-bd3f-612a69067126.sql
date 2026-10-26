
-- ROLES
CREATE TYPE public.app_role AS ENUM ('admin','employee','supplier');
CREATE TYPE public.building_category AS ENUM ('industrial','social','auxiliary','gate');

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  company TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles self read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "profiles self write" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "profiles self update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- USER ROLES
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles self read" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Handle new user -> profile + default employee role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'employee') ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- BUILDINGS (planta São Bernardo)
CREATE TABLE public.buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  name_pt TEXT NOT NULL,
  name_en TEXT,
  category building_category NOT NULL,
  description TEXT,
  department TEXT,
  responsible TEXT,
  phone TEXT,
  hours TEXT,
  notes TEXT,
  photo_url TEXT,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  dock TEXT,
  keywords TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.buildings TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.buildings TO authenticated;
GRANT ALL ON public.buildings TO service_role;
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "buildings public read" ON public.buildings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "buildings admin write" ON public.buildings FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "buildings admin update" ON public.buildings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "buildings admin delete" ON public.buildings FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));

-- SUPPLIER TOKENS
CREATE TABLE public.supplier_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  driver_name TEXT NOT NULL,
  delivery_desc TEXT,
  destination_building_id UUID REFERENCES public.buildings(id),
  entry_gate_id UUID REFERENCES public.buildings(id),
  dock TEXT,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '4 hours'),
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.supplier_tokens TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.supplier_tokens TO authenticated;
GRANT ALL ON public.supplier_tokens TO service_role;
ALTER TABLE public.supplier_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tokens public read by token" ON public.supplier_tokens FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "tokens admin write" ON public.supplier_tokens FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- ARRIVALS
CREATE TABLE public.arrivals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  building_id UUID REFERENCES public.buildings(id),
  supplier_token_id UUID REFERENCES public.supplier_tokens(id),
  company TEXT,
  arrived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  source TEXT
);
GRANT SELECT, INSERT ON public.arrivals TO anon, authenticated;
GRANT ALL ON public.arrivals TO service_role;
ALTER TABLE public.arrivals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "arrivals public insert" ON public.arrivals FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "arrivals self read" ON public.arrivals FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

-- SEARCH LOGS
CREATE TABLE public.search_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  result_building_id UUID REFERENCES public.buildings(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.search_logs TO anon, authenticated;
GRANT ALL ON public.search_logs TO service_role;
ALTER TABLE public.search_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "search_logs insert any" ON public.search_logs FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "search_logs admin read" ON public.search_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin') OR auth.uid() = user_id);

-- FAVORITES
CREATE TABLE public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, building_id)
);
GRANT SELECT, INSERT, DELETE ON public.favorites TO authenticated;
GRANT ALL ON public.favorites TO service_role;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY "favorites self" ON public.favorites FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- BLOCKS (obras/bloqueios)
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind TEXT NOT NULL,
  description TEXT,
  x DOUBLE PRECISION NOT NULL,
  y DOUBLE PRECISION NOT NULL,
  radius DOUBLE PRECISION NOT NULL DEFAULT 40,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.blocks TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.blocks TO authenticated;
GRANT ALL ON public.blocks TO service_role;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks read" ON public.blocks FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "blocks admin write" ON public.blocks FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- SEED prédios reais (coordenadas normalizadas em 0-1000 x 0-560 relativas à imagem)
INSERT INTO public.buildings (number,name_pt,name_en,category,description,department,responsible,phone,hours,dock,x,y,keywords) VALUES
-- Portarias
('P1','Portaria Principal','Main Gate','gate','Entrada principal da planta','Segurança','Portaria 1','11 4173-1000','24h',NULL,610,430,ARRAY['portaria','entrada','gate','main']),
('P2','Portaria 2 - Recebimento de Materiais','Gate 2 - Materials Receiving','gate','Portaria de recebimento de materiais','Logística','Recebimento','11 4173-2000','06h-22h','Doca R1',630,415,ARRAY['portaria','recebimento','materiais','gate 2','113']),
('P3','Portaria 3','Gate 3','gate','Portaria 3','Segurança','Portaria 3',NULL,'24h',NULL,750,470,ARRAY['portaria','gate 3']),
('P4','Portaria 4','Gate 4','gate','Portaria 4 - Expedição','Logística','Portaria 4',NULL,'06h-22h',NULL,890,370,ARRAY['portaria','gate 4','expedicao']),
('P5','Portaria 5','Gate 5','gate','Portaria 5','Segurança','Portaria 5',NULL,'24h',NULL,830,340,ARRAY['portaria','gate 5']),
('P6','Portaria 6','Gate 6','gate','Portaria 6','Segurança','Portaria 6',NULL,'24h',NULL,190,510,ARRAY['portaria','gate 6']),
('129','Portaria Gleba Sul','South Parking Gate','gate','Acesso ao estacionamento sul','Segurança','Portaria Gleba Sul',NULL,'24h',NULL,555,560,ARRAY['portaria','gleba sul','estacionamento']),
-- Industriais
('21','Fabricação de Eixos','Axles Machining & Assembly','industrial','Fabricação e montagem de eixos','Produção','Eng. Carlos Mendes','11 4173-2101','06h-22h','Doca A1',680,430,ARRAY['eixos','axles','fabricacao']),
('31','Montagem de Caminhões','Trucks Final Assembly','industrial','Linha de montagem final de caminhões','Produção','Eng. Ana Ribeiro','11 4173-3140','24h','Doca C1',730,430,ARRAY['caminhoes','trucks','montagem final','40']),
('32','Entrega Técnica de Veículos','Trucks Technical Release','industrial','Entrega técnica e almoxarifado de tintas','Qualidade','Eng. Paulo Souza','11 4173-3200','06h-22h','Doca T1',560,430,ARRAY['entrega tecnica','pintura','tintas','pó']),
('34','Estamparia & KTL','Press Shop & KTL Paint','industrial','Estamparia e pintura KTL','Produção','Eng. Ricardo Alves','11 4173-3400','24h','Doca E1',610,435,ARRAY['estamparia','ktl','pintura','press']),
('41','Montagem de Cabinas','Cabin Trim','industrial','Montagem interna de cabines','Produção','Eng. Marcos Silva','11 4173-4101','24h','Doca CB1',600,470,ARRAY['cabinas','cabines','cabin trim','montagem']),
('45','Usinagem e Montagem de Motores','Engines Machining & Assembly','industrial','Usinagem e montagem de motores e câmbios','Produção','Eng. João Silva','11 4173-4500','24h','Doca M1',850,340,ARRAY['motores','engines','usinagem','cambios','motor']),
('46','Montagem de Chassis de Ônibus','Bus Chassis Assembly','industrial','Linha de chassis para ônibus','Produção','Eng. Fernanda Lima','11 4173-4600','24h','Doca CH1',870,410,ARRAY['onibus','bus','chassis','montagem']),
('58','Fabricação de Peças - MCI','Parts Manufacturing','industrial','Fabricação de peças e montagem inferior','Produção','Eng. Bruno Costa','11 4173-5800','24h','Doca P1',560,470,ARRAY['pecas','parts','mci','underbody']),
('67','Testes e Montagem Motor Câmbio','Engines Test & Dress-up','industrial','Banco de testes e dress-up de motores','Engenharia','Eng. Rafael Torres','11 4173-6700','06h-22h','Doca TM1',900,350,ARRAY['testes motor','dress-up','banco de provas']),
('124','CKD Center','CKD Center','industrial','Centro de kits CKD para exportação','Logística','Eng. Sandra Reis','11 4173-1240','06h-22h','Doca CKD',870,370,ARRAY['ckd','center','exportacao']),
('40','Montagem de Caminhões (Prédio 40)','Trucks Assembly Bldg 40','industrial','Prédio 40 - Montagem de caminhões','Produção','Eng. Ana Ribeiro','11 4173-3140','24h','Doca C2',680,430,ARRAY['caminhoes','trucks','montagem','40']),
-- Sociais
('13','Escritório 13/14','Offices 13/14','social','Escritórios administrativos','Administrativo','Recepção','11 4173-1300','07h-19h',NULL,600,410,ARRAY['escritorio','office']),
('20','Escritórios 20','Offices 20','social','Escritórios administrativos','Administrativo','Recepção','11 4173-2000','07h-19h',NULL,700,435,ARRAY['escritorio','office']),
('39','Restaurante - Ambulatório','Restaurant - Medical Service','social','Restaurante, ambulatório e escritórios','RH / Saúde','Dra. Marina Alves','11 4173-3900','06h-20h',NULL,640,470,ARRAY['restaurante','ambulatorio','medico','saude','refeitorio']),
('52','Posto Bancário','Bank Branch','social','Agência bancária','Serviços','Banco','11 4173-5200','10h-16h',NULL,820,470,ARRAY['banco','bank','posto bancario']),
('54','Escritórios 54','Offices 54','social','Escritórios','Administrativo','Recepção',NULL,'07h-19h',NULL,810,410,ARRAY['escritorio','office']),
('60','Restaurante - Vestiário','Restaurant - Locker Room','social','Restaurante e vestiários','Serviços','Chefe do Restaurante','11 4173-6000','06h-20h',NULL,800,360,ARRAY['restaurante','vestiario','refeitorio']),
('101','Auditório','Auditorium','social','Auditório principal','Eventos','Reservas','11 4173-1010','08h-18h',NULL,720,410,ARRAY['auditorio','auditorium','eventos']),
('102','Centro de Treinamento','Training Center','social','Centro de treinamento corporativo','RH','Coord. de T&D','11 4173-1020','07h-18h',NULL,730,405,ARRAY['treinamento','training','t&d','curso']),
('103','Aprendizagem Industrial','Industrial Learning','social','Escola SENAI Mercedes-Benz','RH','Coord. SENAI','11 4173-1030','07h-17h',NULL,760,390,ARRAY['aprendizagem','senai','learning','escola']),
('104','Quadra de Esportes','Sport Court','social','Quadra poliesportiva','RH','Serviços Gerais',NULL,'06h-22h',NULL,745,395,ARRAY['quadra','esportes','sport']),
('118','Espaço Mercedes','Customer Relationship Center','social','Centro de exibição e relacionamento','Marketing','Recepção Espaço MB','11 4173-1180','09h-18h',NULL,820,420,ARRAY['espaco mercedes','customer','showroom','exposicao']),
('121','Escritório Engenharia','R&D Offices','social','Escritórios de engenharia','Engenharia','Diretoria de Eng.','11 4173-1210','07h-19h',NULL,760,395,ARRAY['engenharia','engineering','r&d']),
('122','Desenvolvimento de Produto','R&D Center','social','Centro de desenvolvimento de produto','Engenharia','Diretoria de P&D','11 4173-1220','07h-19h',NULL,470,455,ARRAY['desenvolvimento','r&d','pd','produto']),
('136','Escritórios 136','Offices 136','social','Escritórios','Administrativo',NULL,NULL,'07h-19h',NULL,690,400,ARRAY['escritorio','office']),
-- Auxiliares
('04','Bombeiros','Fire Department','auxiliary','Corpo de bombeiros da planta','Segurança','Comandante','11 4173-0400','24h',NULL,600,435,ARRAY['bombeiros','fire','emergencia']),
('18','Manutenção','Maintenance','auxiliary','Oficina de manutenção','Manutenção','Chefe da Manutenção',NULL,'06h-22h',NULL,720,470,ARRAY['manutencao','maintenance']),
('42','Almoxarifado 42','Warehouse 42','auxiliary','Almoxarifado geral','Logística','Chefe do Almoxarifado','11 4173-4200','06h-22h','Doca W1',620,475,ARRAY['almoxarifado','warehouse','estoque']),
('44','Ferramentaria','Tooling Workshop','auxiliary','Ferramentaria central','Manutenção','Chefe da Ferramentaria',NULL,'06h-18h',NULL,760,475,ARRAY['ferramentaria','tooling']),
('49','Preparação de Tintas','Paint Preparation','auxiliary','Preparação e almoxarifado de tintas','Produção','Chefe da PT',NULL,'06h-22h',NULL,580,455,ARRAY['tintas','paint','preparacao']),
('140','Posto de Combustível','Gas Station','auxiliary','Posto de abastecimento interno','Serviços','Frentista',NULL,'06h-22h',NULL,540,450,ARRAY['posto','combustivel','gas station']),
('147','Almoxarifado 147','Warehouse 147','auxiliary','Almoxarifado auxiliar','Logística','Chefe do Almoxarifado',NULL,'06h-22h','Doca W2',810,275,ARRAY['almoxarifado','warehouse']),


-- SEED tokens de exemplo
INSERT INTO public.supplier_tokens (token, company, driver_name, delivery_desc, destination_building_id, entry_gate_id, dock, valid_until)
SELECT 'MB-DEMO-MOTOR-001','Bosch do Brasil','João Silva','Entrega de motor completo',
  (SELECT id FROM public.buildings WHERE number='45'),
  (SELECT id FROM public.buildings WHERE number='P2'),
  'Doca M1', now() + interval '4 hours';
INSERT INTO public.supplier_tokens (token, company, driver_name, delivery_desc, destination_building_id, entry_gate_id, dock, valid_until)
SELECT 'MB-DEMO-CHASSI-002','Randon S/A','Maria Santos','Entrega de componentes de chassis',
  (SELECT id FROM public.buildings WHERE number='46'),
  (SELECT id FROM public.buildings WHERE number='P4'),
  'Doca CH1', now() + interval '4 hours';
