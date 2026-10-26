BEGIN;

-- Marker positions use the plant's 2698 x 1964 coordinate system. On conflict,
-- update only the requested category so that names, details, and manually
-- adjusted positions already present in production remain untouched.
INSERT INTO public.buildings (
  number,
  name_pt,
  name_en,
  category,
  description,
  x,
  y,
  keywords
)
VALUES
  -- Social buildings (yellow)
  ('39',  'Restaurante - Ambulatório', 'Restaurant - Medical Service', 'social', 'Restaurante, ambulatório e escritórios', 1256, 1642, ARRAY['restaurante', 'ambulatorio', 'social']),
  ('113', 'Portaria de Materiais', 'Materials Gate', 'social', 'Portaria de materiais (Portaria 2)', 1918, 686, ARRAY['portaria de materiais', 'portaria 2', '113']),
  ('123', 'Portaria 6', 'Gate 6', 'social', 'Edificação da Portaria 6', 330, 1608, ARRAY['portaria 6', '123']),

  -- Industrial buildings (purple)
  ('42',  'Suporte à Produção', 'Production Support', 'industrial', 'Edificação de suporte à produção', 806, 1658, ARRAY['suporte', 'producao', '42']),
  ('114', 'Laboratório de Teste de Emissão', 'Emissions Test Laboratory', 'industrial', 'Laboratório de teste de emissão', 2380, 880, ARRAY['laboratorio', 'teste de emissao', '114']),
  ('147', 'Oficina Mecânica de Automóveis', 'Automotive Workshop', 'industrial', 'Oficina mecânica de automóveis', 1868, 846, ARRAY['oficina mecanica', 'automoveis', '147']),

  -- Auxiliary buildings (orange)
  ('22',  'Qualidade', 'Quality', 'auxiliary', 'Área de qualidade', 1766, 1480, ARRAY['qualidade', '22']),
  ('24',  'Subestação', 'Substation', 'auxiliary', 'Subestação elétrica', 716, 1550, ARRAY['subestacao', 'energia', '24']),
  ('25',  'Torre de Resfriamento', 'Cooling Tower', 'auxiliary', 'Torre de resfriamento', 1660, 1616, ARRAY['torre de resfriamento', '25']),
  ('29',  'Oficinas', 'Workshops', 'auxiliary', 'Área de oficinas', 988, 1282, ARRAY['oficinas', '29']),
  ('30',  'Protótipos', 'Prototypes', 'auxiliary', 'Área de protótipos', 674, 1286, ARRAY['prototipos', '30']),
  ('35',  'Tratamento de Água Industrial', 'Industrial Water Treatment', 'auxiliary', 'Tratamento de água industrial', 590, 1460, ARRAY['tratamento de agua', '35']),
  ('37',  'Tratamento de Efluentes', 'Effluent Treatment', 'auxiliary', 'Tratamento de efluentes', 620, 1300, ARRAY['tratamento de efluentes', '37']),
  ('47',  'Casa de Bombas', 'Pump Station', 'auxiliary', 'Casa de bombas', 1910, 914, ARRAY['casa de bombas', '47']),
  ('50',  'Reservatório de Água', 'Water Reservoir', 'auxiliary', 'Reservatório de água', 578, 1670, ARRAY['reservatorio de agua', '50']),
  ('58',  'Almoxarifado', 'Warehouse', 'auxiliary', 'Almoxarifado', 742, 1412, ARRAY['almoxarifado', '58']),
  ('62',  'Manutenção', 'Maintenance', 'auxiliary', 'Área de manutenção', 1916, 1602, ARRAY['manutencao', '62']),
  ('65',  'Casa de Bombas', 'Pump Station', 'auxiliary', 'Casa de bombas', 2370, 910, ARRAY['casa de bombas', '65']),
  ('66',  'Expedição de Veículos - Portaria 4', 'Vehicle Dispatch - Gate 4', 'auxiliary', 'Expedição de veículos da Portaria 4', 2556, 1276, ARRAY['expedicao de veiculos', 'portaria 4', '66']),
  ('68',  'Reservatório de Combustíveis', 'Fuel Reservoir', 'auxiliary', 'Reservatório de combustíveis', 2310, 1060, ARRAY['reservatorio de combustiveis', '68']),
  ('79',  'Central de Amônia', 'Ammonia Plant', 'auxiliary', 'Central de amônia', 1950, 928, ARRAY['central de amonia', '79']),
  ('80',  'Prédio 80', 'Building 80', 'auxiliary', 'Prédio auxiliar 80', 1868, 1450, ARRAY['predio 80', '80']),
  ('106', 'Utilidades', 'Utilities', 'auxiliary', 'Área de utilidades', 1828, 700, ARRAY['utilidades', '106']),
  ('110', 'Balança', 'Weighbridge', 'auxiliary', 'Balança de veículos', 1926, 764, ARRAY['balanca', 'weighbridge', '110']),
  ('116', 'Suporte à Produção', 'Production Support', 'auxiliary', 'Suporte à produção', 1146, 1482, ARRAY['suporte a producao', '116']),
  ('117', 'Almoxarifado de Estampos', 'Die Warehouse', 'auxiliary', 'Almoxarifado de estampos', 1142, 1426, ARRAY['almoxarifado de estampos', '117']),
  ('120', 'Área de Reciclagem', 'Recycling Area', 'auxiliary', 'Área de reciclagem', 2050, 548, ARRAY['reciclagem', '120']),
  ('124', 'CKD Center', 'CKD Center', 'auxiliary', 'Centro de kits CKD para exportação', 2408, 1398, ARRAY['ckd', 'center', '124']),
  ('128', 'Área de Embalagens', 'Packaging Area', 'auxiliary', 'Área de embalagens', 1650, 824, ARRAY['embalagens', '128']),
  ('130', 'Almoxarifado de Solventes', 'Solvent Warehouse', 'auxiliary', 'Almoxarifado de solventes', 652, 1470, ARRAY['almoxarifado de solventes', '130']),
  ('131', 'Galpão de Leilão', 'Auction Warehouse', 'auxiliary', 'Galpão de leilão', 1758, 614, ARRAY['galpao de leilao', '131']),
  ('132', 'Armazenagem de Resíduos', 'Waste Storage', 'auxiliary', 'Armazenagem de resíduos', 622, 1400, ARRAY['armazenagem de residuos', '132']),
  ('134', 'Benchmarking', 'Benchmarking', 'auxiliary', 'Área de benchmarking', 1550, 1670, ARRAY['benchmarking', '134']),
  ('137', 'Área para Sucata', 'Scrap Area', 'auxiliary', 'Área destinada a sucata', 606, 1528, ARRAY['sucata', '137']),
  ('138', 'Central de Cavacos', 'Swarf Processing Center', 'auxiliary', 'Central de cavacos', 620, 1360, ARRAY['central de cavacos', '138']),
  ('141', 'Galpão de Descontaminação', 'Decontamination Warehouse', 'auxiliary', 'Galpão de descontaminação de máquinas e equipamentos', 1910, 660, ARRAY['descontaminacao', 'maquinas', '141']),
  ('142', 'Almoxarifado de Longarinas', 'Side-member Warehouse', 'auxiliary', 'Almoxarifado de longarinas', 2110, 780, ARRAY['almoxarifado de longarinas', '142']),
  ('145', 'Central de Água Gelada', 'Chilled Water Plant', 'auxiliary', 'Central de água gelada', 2280, 1080, ARRAY['agua gelada', '145']),
  ('146', 'DECON / Almoxarifado - Miniload', 'DECON / Miniload Warehouse', 'auxiliary', 'DECON e almoxarifado Miniload', 1918, 1162, ARRAY['decon', 'almoxarifado', 'miniload', '146'])
ON CONFLICT (number) DO UPDATE
SET category = EXCLUDED.category;

COMMIT;
