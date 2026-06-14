DELETE FROM products;
DELETE FROM sqlite_sequence WHERE name='products';

INSERT INTO products (id, title, description, category, image_key, rate, status) VALUES
(1, 'Beauty Blender Travel Case', 'A breathable, 3D printed travel case for your beauty blender.', 'Personalized', '/models/beauty_blender_travel_case.stl', 199.00, 'active'),
(2, 'Lipstick Case Keychain', 'A portable and stylish 3D printed case to keep your lipstick handy on your keys.', 'Personalized', '/models/lipstick_case_keychain.stl', 149.00, 'active');
