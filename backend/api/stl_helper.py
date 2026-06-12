import trimesh
import os

def calculate_mesh_volume(file_path):
    """
    Attempts to calculate mesh volume in cm3 from a 3D model file (STL, OBJ, etc.)
    using trimesh library. Falls back to 50.0 cm3 if it fails.
    """
    if not os.path.exists(file_path):
        return 50.0
        
    try:
        # Load mesh
        mesh = trimesh.load(file_path, force='mesh')
        if mesh.is_empty:
            return 50.0
            
        # trimesh calculates volume in units^3. STL units are usually mm.
        # 1 cm3 = 1000 mm3.
        volume_mm3 = abs(mesh.volume)
        volume_cm3 = volume_mm3 / 1000.0
        
        # Guard against absurd values
        if volume_cm3 <= 0:
            return 50.0
            
        return round(volume_cm3, 2)
    except Exception as e:
        print(f"Failed to parse 3D mesh volume for {file_path}: {e}")
        return 50.0
