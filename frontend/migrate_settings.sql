CREATE TABLE IF NOT EXISTS site_settings (
  setting_key TEXT PRIMARY KEY,
  setting_value TEXT NOT NULL
);

INSERT OR IGNORE INTO site_settings (setting_key, setting_value) VALUES 
('hero_title1', 'HONOR YOUR HELMET.'),
('hero_title2', 'ELEVATE YOUR SPACE.'),
('hero_description', 'India''s first wall mount engineered to transform your riding gear into a premium display piece. High-strength structural printing meets architectural minimalism.'),
('hero_price', '299'),
('hero_model_url', '/models/helmet_holder.stl');
