#!/usr/bin/env python3
"""
NC Bourbon Tracker Project Documentation Generator (Enhanced)

Outputs:
    - project-structure.json: Complete project structure and metadata
    - project-source.md: All important source code files
    - api-routes.json: All Express endpoints extracted from backend/routes/
    - env-vars.json: All environment variables (from .env.example)
"""

import os
import re
import json
import datetime
from pathlib import Path
from typing import Dict, List, Tuple

class ProjectDocumenter:
    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root).resolve()
        self.timestamp = datetime.datetime.now().isoformat()

        # Files and directories to exclude
        self.exclude_dirs = {
            'node_modules', '.git', '__pycache__', '.vscode', '.idea',
            'dist', 'build', '.next', 'coverage', 'logs'
        }
        self.exclude_files = {
            '.DS_Store', 'Thumbs.db', '*.log', '*.tmp', '*.pyc',
            '.env', '.env.local', '.env.production', '.env.development'
        }
        # Important file extensions to include in source documentation
        self.important_extensions = {
            '.js', '.jsx', '.ts', '.tsx', '.css', '.json', '.md',
            '.py', '.sql', '.yaml', '.yml', '.env.example'
        }
        # Critical files to always include (even if extension not in list)
        self.critical_files = {
            'package.json', 'package-lock.json', 'README.md', 'Dockerfile',
            'docker-compose.yml', '.gitignore', 'server.js', 'App.jsx'
        }

    def should_exclude_dir(self, dir_name: str) -> bool:
        """Check if directory should be excluded"""
        return dir_name in self.exclude_dirs or dir_name.startswith('.')

    def should_include_file(self, file_path: Path) -> bool:
        """Check if file should be included in source documentation"""
        if file_path.name in self.critical_files:
            return True
        if file_path.suffix.lower() in self.important_extensions:
            return True
        return False

    def get_project_structure(self) -> Dict:
        """Generate complete project structure"""
        structure = {
            "project_name": "NC Bourbon Tracker",
            "generated_at": self.timestamp,
            "root_path": str(self.project_root),
            "architecture": {
                "type": "Full Stack Web Application",
                "frontend": "React + Vite",
                "backend": "Node.js + Express",
                "database": "SQLite",
                "auth": "JWT with HTTP-only cookies",
                "security": "Secure by default architecture"
            },
            "directory_structure": {},
            "file_summary": {
                "total_files": 0,
                "important_files": 0,
                "file_types": {}
            },
            "key_decisions": [
                "Implemented secure-by-default authentication",
                "Separated PublicLayout vs AuthenticatedLayout",
                "JWT stored in HTTP-only cookies",
                "Role-based access control (admin, power_user, user)",
                "Full-width background images on all pages"
            ]
        }

        for root, dirs, files in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(d)]
            root_path = Path(root)
            rel_path = root_path.relative_to(self.project_root)
            if any(part.startswith('.') or part in self.exclude_dirs for part in rel_path.parts):
                continue
            dir_key = str(rel_path) if str(rel_path) != '.' else 'root'
            structure["directory_structure"][dir_key] = {
                "files": [],
                "purpose": self.get_directory_purpose(rel_path)
            }
            for file in files:
                file_path = root_path / file
                rel_file_path = file_path.relative_to(self.project_root)
                file_info = {
                    "name": file,
                    "path": str(rel_file_path),
                    "size": file_path.stat().st_size,
                    "important": self.should_include_file(file_path),
                    "type": file_path.suffix.lower() or "no_extension"
                }
                structure["directory_structure"][dir_key]["files"].append(file_info)
                structure["file_summary"]["total_files"] += 1
                if file_info["important"]:
                    structure["file_summary"]["important_files"] += 1
                file_type = file_info["type"]
                structure["file_summary"]["file_types"][file_type] = \
                    structure["file_summary"]["file_types"].get(file_type, 0) + 1
        return structure

    def get_directory_purpose(self, rel_path: Path) -> str:
        """Get human-readable purpose of directory"""
        path_str = str(rel_path).lower()
        purposes = {
            'frontend': "React frontend application",
            'backend': "Node.js backend server",
            'frontend/src': "React source code",
            'frontend/src/components': "Reusable React components",
            'frontend/src/pages': "Page-level React components",
            'frontend/src/contexts': "React context providers",
            'frontend/public': "Static assets and images",
            'frontend/public/images': "Background images and assets",
            'backend/routes': "Express.js API route handlers",
            'backend/controllers': "Business logic controllers",
            'backend/middleware': "Authentication and other middleware",
            'backend/config': "Database and configuration files",
            'backend/data': "Database files and migrations"
        }
        return purposes.get(path_str, "Project files")

    def categorize_file(self, file_path: str) -> str:
        """Categorize file based on path and name"""
        path_lower = file_path.lower()
        if file_path in ['package.json', 'package-lock.json', '.gitignore', 'README.md']:
            return "Configuration Files"
        elif 'frontend/src/pages' in path_lower:
            return "Frontend - Pages"
        elif 'frontend/src/components' in path_lower:
            return "Frontend - Components"
        elif path_lower.endswith('.css'):
            return "Frontend - Styling"
        elif file_path in ['frontend/src/App.jsx', 'frontend/src/main.jsx']:
            return "Frontend - Main App"
        elif 'frontend/src' in path_lower:
            return "Frontend - Components"
        elif file_path == 'backend/server.js' or 'backend/app.js' in path_lower:
            return "Backend - Main"
        elif 'backend/routes' in path_lower:
            return "Backend - Routes"
        elif 'backend/controllers' in path_lower:
            return "Backend - Controllers"
        elif 'backend/middleware' in path_lower:
            return "Backend - Middleware"
        elif 'backend/config' in path_lower or 'backend/data' in path_lower:
            return "Backend - Config"
        else:
            return "Configuration Files"

    def get_file_description(self, file_path: str) -> str:
        """Get human-readable description of file purpose"""
        descriptions = {
            'package.json': "Project dependencies and scripts",
            'frontend/src/App.jsx': "Main React app with secure-by-default routing",
            'frontend/src/main.jsx': "React app entry point",
            'backend/server.js': "Express server with security middleware",
            'frontend/src/pages/Login.jsx': "Login page component with styled form",
            'frontend/src/pages/Register.jsx': "Registration page component",
            'frontend/src/pages/Home.jsx': "Protected home page",
            'frontend/src/pages/Admin.jsx': "Admin dashboard for user management",
            'frontend/src/components/PublicLayout.jsx': "Layout for unauthenticated users",
            'frontend/src/components/ProtectedRoute.jsx': "Route protection component",
            'frontend/src/contexts/AuthContext.jsx': "Authentication state management",
            'backend/routes/authRoutes.js': "Authentication API endpoints",
            'backend/routes/adminRoutes.js': "Admin API endpoints",
            'backend/controllers/authController.js': "Authentication business logic",
            'backend/controllers/adminController.js': "Admin functionality",
            'backend/middleware/authMiddleware.js': "JWT authentication middleware"
        }
        return descriptions.get(file_path, f"Project file: {file_path}")

    def get_file_language(self, file_path: str) -> str:
        """Get language identifier for syntax highlighting"""
        ext = Path(file_path).suffix.lower()
        language_map = {
            '.js': 'javascript',
            '.jsx': 'jsx',
            '.ts': 'typescript',
            '.tsx': 'tsx',
            '.css': 'css',
            '.json': 'json',
            '.md': 'markdown',
            '.py': 'python',
            '.sql': 'sql',
            '.yaml': 'yaml',
            '.yml': 'yaml'
        }
        return language_map.get(ext, 'text')

    def read_file_safely(self, file_path: Path) -> str:
        """Safely read file content, handling encoding issues"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            try:
                with open(file_path, 'r', encoding='latin-1') as f:
                    return f.read()
            except Exception:
                return f"[Could not read file: {file_path}]"
        except Exception as e:
            return f"[Error reading file: {e}]"

    def extract_express_routes(self) -> List[Dict]:
        """Scan backend/routes/ for Express route definitions (method, path, file)."""
        routes = []
        routes_dir = self.project_root / 'backend' / 'routes'
        if not routes_dir.exists():
            return routes
        route_pattern = re.compile(
            r"router\.(get|post|put|patch|delete)\(\s*['\"](.*?)['\"]",
            re.IGNORECASE
        )
        for route_file in routes_dir.glob("*.js"):
            try:
                with open(route_file, "r", encoding="utf-8") as f:
                    text = f.read()
                for match in route_pattern.finditer(text):
                    method, path = match.groups()
                    routes.append({
                        "method": method.upper(),
                        "path": path,
                        "file": str(route_file.relative_to(self.project_root))
                    })
            except Exception:
                continue
        return routes

    def extract_env_vars(self) -> List[Dict]:
        """Parse .env.example for environment variables and comments."""
        env_vars = []
        env_file = self.project_root / '.env.example'
        if not env_file.exists():
            return env_vars
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.rstrip()
                if not line or line.startswith('#'):
                    continue
                if "=" in line:
                    var, val = line.split("=", 1)
                    comment = ""
                    env_vars.append({
                        "name": var.strip(),
                        "default": val.strip(),
                        "comment": comment
                    })
        return env_vars

    def extract_todos(self) -> List[Dict]:
        """Scan important source files for TODO/FIXME comments."""
        todos = []
        important_files = []
        for root, dirs, files in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(d)]
            root_path = Path(root)
            rel_path = root_path.relative_to(self.project_root)
            if any(part.startswith('.') or part in self.exclude_dirs for part in rel_path.parts):
                continue
            for file in files:
                file_path = root_path / file
                if self.should_include_file(file_path):
                    important_files.append((str(file_path.relative_to(self.project_root)), file_path))
        for rel_path, full_path in important_files:
            try:
                with open(full_path, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f, 1):
                        if 'TODO' in line or 'FIXME' in line:
                            todos.append({
                                "file": rel_path,
                                "line": i,
                                "text": line.strip()
                            })
            except Exception:
                continue
        return todos

    def read_changelog(self) -> str:
        changelog_file = self.project_root / "CHANGELOG.md"
        if changelog_file.exists():
            try:
                with open(changelog_file, "r", encoding="utf-8") as f:
                    return f.read()
            except Exception:
                return "[Error reading CHANGELOG.md]"
        return ""

    def generate_source_documentation(self, api_routes, env_vars, todos, changelog) -> str:
        md_content = f"""# NC Bourbon Tracker - Source Code Documentation

**Generated:** {self.timestamp}  
**Project Root:** {self.project_root}

## Architecture Overview

This project uses a **secure-by-default architecture** with:

- **Frontend:** React with Vite, using a two-layout system (PublicLayout for auth, AuthenticatedLayout for app)
- **Backend:** Node.js with Express, JWT authentication via HTTP-only cookies
- **Database:** SQLite with user management and future ABC warehouse data
- **Security:** All routes protected by default, explicit public routes only for auth

## API Endpoints (Auto-Extracted)
"""
        if api_routes:
            md_content += "\n| Method | Path | File |\n|---|---|---|\n"
            for r in api_routes:
                md_content += f"| `{r['method']}` | `{r['path']}` | `{r['file']}` |\n"
        else:
            md_content += "\n_No Express routes found._\n"

        md_content += "\n## Environment Variables (from .env.example)\n"
        if env_vars:
            md_content += "\n| Name | Default | Comment |\n|---|---|---|\n"
            for v in env_vars:
                md_content += f"| `{v['name']}` | `{v['default']}` | {v['comment']} |\n"
        else:
            md_content += "\n_No .env.example found or no variables detected._\n"

        md_content += "\n## TODOs / FIXMEs\n"
        if todos:
            for t in todos:
                md_content += f"- {t['file']} (line {t['line']}): {t['text']}\n"
        else:
            md_content += "\n_No TODOs or FIXMEs found._\n"

        if changelog:
            md_content += "\n## Change Log\n"
            md_content += changelog

        # Collect all important files
        important_files = []
        for root, dirs, files in os.walk(self.project_root):
            dirs[:] = [d for d in dirs if not self.should_exclude_dir(d)]
            root_path = Path(root)
            rel_path = root_path.relative_to(self.project_root)
            if any(part.startswith('.') or part in self.exclude_dirs for part in rel_path.parts):
                continue
            for file in files:
                file_path = root_path / file
                if self.should_include_file(file_path):
                    rel_file_path = file_path.relative_to(self.project_root)
                    important_files.append((str(rel_file_path), file_path))
        important_files.sort(key=lambda x: (x[0].count('/'), x[0]))
        categories = {
            "Configuration Files": [],
            "Frontend - Main App": [],
            "Frontend - Components": [],
            "Frontend - Pages": [],
            "Frontend - Styling": [],
            "Backend - Main": [],
            "Backend - Routes": [],
            "Backend - Controllers": [],
            "Backend - Middleware": [],
            "Backend - Config": []
        }
        for rel_path, full_path in important_files:
            content = self.read_file_safely(full_path)
            if content is None:
                continue
            category = self.categorize_file(rel_path)
            categories[category].append({
                "path": rel_path,
                "content": content,
                "description": self.get_file_description(rel_path)
            })
        for category, files in categories.items():
            if not files:
                continue
            md_content += f"\n## {category}\n\n"
            for file_info in files:
                md_content += f"### {file_info['path']}\n\n"
                md_content += f"**Purpose:** {file_info['description']}\n\n"
                md_content += f"```{self.get_file_language(file_info['path'])}\n"
                md_content += file_info['content']
                md_content += "\n```\n\n"

        return md_content

    def generate_documentation(self):
        print("🔍 Scanning project structure...")
        structure = self.get_project_structure()

        print("🔎 Extracting Express API routes...")
        api_routes = self.extract_express_routes()
        with open(self.project_root / "api-routes.json", 'w', encoding='utf-8') as f:
            json.dump(api_routes, f, indent=2)

        print("🗒️  Parsing environment variables...")
        env_vars = self.extract_env_vars()
        with open(self.project_root / "env-vars.json", 'w', encoding='utf-8') as f:
            json.dump(env_vars, f, indent=2)

        print("🚦 Scanning for TODOs/FIXMEs...")
        todos = self.extract_todos()

        print("📝 Checking for CHANGELOG.md...")
        changelog = self.read_changelog()

        print("📊 Generating structure documentation...")
        structure_file = self.project_root / "project-structure.json"
        with open(structure_file, 'w', encoding='utf-8') as f:
            json.dump(structure, f, indent=2, default=str)

        print("📝 Generating source code documentation...")
        source_content = self.generate_source_documentation(api_routes, env_vars, todos, changelog)
        source_file = self.project_root / "project-source.md"
        with open(source_file, 'w', encoding='utf-8') as f:
            f.write(source_content)

        print(f"\n✅ Documentation generated successfully!")
        print(f"📁 Structure: {structure_file}")
        print(f"📄 Source: {source_file}")
        print(f"🔎 API Routes: {self.project_root / 'api-routes.json'}")
        print(f"🗒️  Env Vars: {self.project_root / 'env-vars.json'}")
        print(f"\n📊 Summary:")
        print(f"   • Total files scanned: {structure['file_summary']['total_files']}")
        print(f"   • Important files documented: {structure['file_summary']['important_files']}")
        print(f"   • File types: {', '.join(structure['file_summary']['file_types'].keys())}")

        print(f"\n💡 Usage:")
        print(f"   • Copy project-structure.json for quick project overview")
        print(f"   • Copy relevant sections of project-source.md for detailed code context")
        print(f"   • Use api-routes.json and env-vars.json for onboarding or AI code suggestions")

if __name__ == "__main__":
    documenter = ProjectDocumenter()
    documenter.generate_documentation()
