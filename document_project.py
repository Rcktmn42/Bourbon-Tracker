#!/usr/bin/env python3
"""
Enhanced NC Bourbon Tracker Documentation Generator

Improvements for better AI chat context:
- Captures both user and inventory SQLite databases with full schema
- Detects Knex usage and database configuration
- Extracts environment variables structure
- Identifies authentication system components
- Captures email templates and service configuration
- Includes package.json dependencies analysis
- Better React component detection
- Captures CSS/styling approach
- Identifies current development status from recent commits
"""

import os
import re
import json
import argparse
import datetime
import sqlite3
import subprocess
from pathlib import Path
from typing import Dict, List, Set, Optional, Any


class EnhancedBourbonTrackerDocumenter:
    def __init__(self, project_root: str = ".", verbose: bool = False):
        self.project_root = Path(project_root).resolve()
        self.output_dir = self.project_root / "Project_Files"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.timestamp = datetime.datetime.now().isoformat()
        self.verbose = verbose

        print(f"[docgen] project_root = {self.project_root}")
        print(f"[docgen] output_dir   = {self.output_dir}")

        # Smart exclusions
        self.exclude_dirs = {
            'node_modules', '.git', '__pycache__', '.vscode', '.idea',
            'dist', 'build', '.next', 'coverage', 'logs', 'Project', 'Project_files'
        }

        # Files to skip
        self.skip_files = {
            'package-lock.json', '.gitignore', 'vite.config.js', 'eslint.config.js'
        }

        # Files to summarize
        self.summarize_only = {
            'package.json': self.summarize_package_json,
            '.env.example': self.summarize_env_file,
            '.env': self.summarize_env_file,
        }

        # Critical files for full source
        self.critical_full_source = {
            'backend/server.js',
            'backend/config/db.js',
            'frontend/src/App.jsx',
            'frontend/src/main.jsx',
            'backend/routes/authRoutes.js',
            'backend/controllers/authController.js',
            'backend/controllers/userController.js',
            'backend/middleware/authMiddleware.js',
            'frontend/src/contexts/AuthContext.jsx',
            'backend/services/emailService.js',
        }

        # Content filters
        self.filter_content = {
            '.jsx': self.filter_react_component,
            '.tsx': self.filter_react_component,
            '.js': self.filter_javascript,
            '.ts': self.filter_javascript,
            '.css': self.filter_css,
        }

        self.important_extensions = {
            '.js', '.jsx', '.ts', '.tsx', '.css', '.md', '.py', '.sql', '.json', '.html'
        }

        self.lang_map = {
            '.js': 'javascript', '.jsx': 'jsx', '.ts': 'typescript', '.tsx': 'tsx',
            '.py': 'python', '.sql': 'sql', '.json': 'json', '.md': 'markdown',
            '.css': 'css', '.html': 'html'
        }

    # Content transformers
    def summarize_package_json(self, content: str) -> str:
        try:
            data = json.loads(content)
            # Enhanced package.json analysis
            summary = {
                "name": data.get("name"),
                "version": data.get("version"),
                "description": data.get("description"),
                "scripts": data.get("scripts", {}),
                "dependencies": data.get("dependencies", {}),
                "devDependencies": data.get("devDependencies", {}),
                "main": data.get("main"),
                "type": data.get("type")
            }
            
            # Identify key technologies
            deps = {**summary["dependencies"], **summary["devDependencies"]}
            tech_stack = []
            if "react" in deps: tech_stack.append(f"React {deps['react']}")
            if "express" in deps: tech_stack.append(f"Express {deps['express']}")
            if "knex" in deps: tech_stack.append(f"Knex {deps['knex']}")
            if "sqlite3" in deps: tech_stack.append(f"SQLite3 {deps['sqlite3']}")
            if "nodemailer" in deps: tech_stack.append(f"Nodemailer {deps['nodemailer']}")
            if "bcryptjs" in deps: tech_stack.append(f"bcryptjs {deps['bcryptjs']}")
            if "jsonwebtoken" in deps: tech_stack.append(f"JWT {deps['jsonwebtoken']}")
            
            summary["detected_tech_stack"] = tech_stack
            return f"Package Analysis:\n{json.dumps(summary, indent=2)}"
        except Exception as e:
            return f"Package.json (parse error): {e}"

    def summarize_env_file(self, content: str) -> str:
        lines = content.split('\n')
        vars_list = []
        comments = []
        
        for line in lines:
            line = line.strip()
            if line.startswith('#') and not line.startswith('##'):
                comments.append(line[1:].strip())
            elif line and '=' in line and not line.startswith('#'):
                var_name = line.split('=')[0].strip()
                vars_list.append(var_name)
        
        return json.dumps({
            "environment_variables": vars_list,
            "configuration_notes": comments[:5]  # First 5 comments
        }, indent=2)

    def filter_react_component(self, content: str, file_path: str) -> str:
        lines = content.split('\n')
        filtered_lines = []
        
        # Keep important imports, filter common library imports
        for line in lines:
            if line.strip().startswith('import'):
                # Keep relative imports, context imports, and non-standard library imports
                if any(keep in line for keep in ['./components', '../', '@/', 'contexts', 'pages']):
                    filtered_lines.append(line)
                elif not any(skip in line.replace('"', "'") for skip in [
                    "from 'react'", "from 'react-dom'", "from 'react-router'", 
                    "from 'react-router-dom'", "from 'axios'"
                ]):
                    filtered_lines.append(line)
            else:
                filtered_lines.append(line)

        filtered_content = '\n'.join(filtered_lines)

        # If still long, extract component signature + key JSX structure
        if len(filtered_content) > 2500:
            # Extract component name and props
            comp_match = re.search(
                r'(export\s+default\s+function\s+(\w+)|function\s+(\w+)|const\s+(\w+)\s*=)',
                filtered_content
            )
            
            # Extract JSX return structure (first few levels)
            jsx_structure = self.extract_jsx_structure(filtered_content)
            
            comp_name = "Component"
            if comp_match:
                comp_name = comp_match.group(2) or comp_match.group(3) or comp_match.group(4) or "Component"
            
            return f"function {comp_name}\n/* ...component logic elided... */\n{jsx_structure}"

        return filtered_content

    def extract_jsx_structure(self, content: str) -> str:
        """Extract high-level JSX structure"""
        jsx_match = re.search(r'return\s*\((.*?)\);', content, re.DOTALL)
        if jsx_match:
            jsx = jsx_match.group(1).strip()
            # Extract opening tags to show structure
            tags = re.findall(r'<(\w+)', jsx)[:10]  # First 10 tags
            if tags:
                return f"return (\n  {' -> '.join(tags)}\n  /* ...JSX structure... */\n);"
        return "return (\n  /* ...JSX content... */\n);"
    
    def detect_css_approach(self, content: str) -> List[str]:
        """Detect CSS methodology and frameworks"""
        approaches = []
        
        if "display: grid" in content or "grid-template" in content:
            approaches.append("CSS Grid")
        if "display: flex" in content or "justify-content" in content:
            approaches.append("Flexbox")
        if "calc(-50vw + 50%)" in content:
            approaches.append("Container breaking patterns")
        if "rgba(" in content or "hsla(" in content:
            approaches.append("Alpha transparency")
        if "@media" in content:
            approaches.append("Responsive design")
        if "background:" in content and "url(" in content:
            approaches.append("Background images")
    
        return approaches

    def extract_component_classes(self, content: str) -> List[str]:
        """Extract component-specific class names"""
        classes = re.findall(r'\.([a-zA-Z][\w-]+)', content)
        # Prioritize component/page classes
        component_classes = [c for c in set(classes) if any(
            keyword in c.lower() for keyword in [
                'page', 'container', 'header', 'form', 'button', 'card', 
                'navigation', 'modal', 'sidebar', 'content'
            ]
        )]
        return sorted(component_classes)[:15]

    def detect_layout_patterns(self, content: str) -> List[str]:
        """Detect layout methodologies in use"""
        patterns = []
        
        if "position: fixed" in content:
            patterns.append("Fixed positioning")
        if "min-height: 100vh" in content or "height: 100vh" in content:
            patterns.append("Full viewport height")
        if "margin: 0 auto" in content:
            patterns.append("Auto centering")
        if "transform:" in content and "translate" in content:
            patterns.append("Transform positioning")
            
        return patterns

    def has_media_queries(self, content: str) -> Dict[str, Any]:
        """Analyze responsive design implementation"""
        media_queries = re.findall(r'@media[^{]*\([^)]*\)', content)
        
        return {
            "count": len(media_queries),
            "breakpoints": media_queries[:5] if media_queries else []
        }

    def filter_javascript(self, content: str, file_path: str) -> str:
        # Enhanced route extraction
        if 'routes' in file_path.replace('\\', '/'):
            routes = self.extract_routes_from_content(content)
            if routes:
                return "// Route definitions:\n" + '\n'.join(routes)

        # For controllers, extract function signatures
        if 'controllers' in file_path:
            functions = re.findall(r'export\s+(?:async\s+)?function\s+(\w+)', content)
            if functions:
                func_list = '\n'.join([f"export async function {name}" for name in functions])
                return f"// Key exports:\n{func_list}\n\n// File too long, showing exports only. Full file: {len(content)} chars"

        # Default JS filtering
        if len(content) > 2000:
            exports = re.findall(r'export\s+(?:default\s+)?(?:async\s+)?(?:function\s+\w+|const\s+\w+|class\s+\w+)', content)
            if exports:
                return "// Key exports:\n" + '\n'.join(exports) + f"\n\n// File too long, showing exports only. Full file: {len(content)} chars"
        return content

    def extract_routes_from_content(self, content: str) -> List[str]:
        """Extract route definitions from JavaScript content"""
        patterns = [
            r"router\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]",
            r"app\.(get|post|put|delete|patch)\(\s*['\"]([^'\"]+)['\"]"
        ]
        
        routes = []
        for pattern in patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for method, path in matches:
                routes.append(f"router.{method.lower()}('{path}')")
        return routes

    def filter_css(self, content: str, file_path: str) -> str:
        """Enhanced CSS analysis with styling methodology detection"""
        if len(content) > 1500:
            analysis = {
                "file_size": len(content),
                "styling_approach": self.detect_css_approach(content),
                "key_classes": self.extract_component_classes(content),
                "layout_methods": self.detect_layout_patterns(content),
                "responsive_design": self.has_media_queries(content)
            }
            return f"/* CSS Analysis: */\n{json.dumps(analysis, indent=2)}\n\n/* Full CSS truncated for brevity */"
        return content

    # Database schema extraction
    def extract_sqlite_schemas(self) -> Dict[str, Any]:
        """Extract schemas from both user and inventory databases"""
        schemas = {}
        
        # Database locations to check
        db_locations = [
            # User database
            ("user_database", self.project_root / "backend" / "data" / "database.sqlite3"),
            # Inventory database - dev location
            ("inventory_database", self.project_root / "BourbonDatabase" / "inventory.db"),
            # Inventory database - production location (if accessible)
            ("inventory_database_prod", Path("/opt/BourbonDatabase/inventory.db"))
        ]
        
        # Also find any other .db or .sqlite files
        for db_file in self.project_root.rglob("*.db"):
            if not any(part in self.exclude_dirs for part in db_file.parts):
                rel_path = str(db_file.relative_to(self.project_root))
                db_locations.append((f"database_{rel_path.replace('/', '_').replace('.', '_')}", db_file))
        
        for db_name, db_path in db_locations:
            if not db_path.exists():
                continue
                
            try:
                schema = self.extract_single_sqlite_schema(db_path)
                if schema:
                    schemas[db_name] = {
                        "path": str(db_path),
                        "schema": schema
                    }
                    if self.verbose:
                        print(f"[db] Extracted schema from {db_path}")
            except Exception as e:
                if self.verbose:
                    print(f"[db-error] Could not read {db_path}: {e}")
        
        return schemas

    def extract_single_sqlite_schema(self, db_path: Path) -> Optional[Dict]:
        """Extract schema from a single SQLite database"""
        try:
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            
            # Get all tables
            cursor.execute("SELECT name, sql FROM sqlite_master WHERE type='table'")
            tables_data = cursor.fetchall()
            
            schema = {
                "tables": {},
                "foreign_keys": [],
                "samples": {},
                "metadata": {}
            }
            
            for table_name, create_sql in tables_data:
                if table_name.startswith('sqlite_'):
                    continue
                    
                # Store CREATE TABLE statement
                schema["tables"][table_name] = create_sql
                
                # Get column info
                cursor.execute(f"PRAGMA table_info({table_name})")
                columns_info = cursor.fetchall()
                
                # Get foreign keys
                cursor.execute(f"PRAGMA foreign_key_list({table_name})")
                fk_info = cursor.fetchall()
                for fk in fk_info:
                    schema["foreign_keys"].append({
                        "table": table_name,
                        "id": fk[0], "seq": fk[1], "ref_table": fk[2],
                        "from_column": fk[3], "to_column": fk[4],
                        "on_update": fk[5], "on_delete": fk[6], "match": fk[7]
                    })
                
                # Get sample data (first 5 rows)
                try:
                    cursor.execute(f"SELECT * FROM {table_name} LIMIT 5")
                    sample_rows = cursor.fetchall()
                    if sample_rows:
                        column_names = [desc[1] for desc in columns_info]
                        schema["samples"][table_name] = {
                            "columns": column_names,
                            "rows": sample_rows
                        }
                except Exception as e:
                    if self.verbose:
                        print(f"[db-sample] Could not get sample from {table_name}: {e}")
            
            conn.close()
            return schema
            
        except Exception as e:
            if self.verbose:
                print(f"[db-error] Failed to extract schema from {db_path}: {e}")
            return None

    # Enhanced technology detection
    def detect_project_architecture(self) -> Dict[str, Any]:
        """Comprehensive project architecture detection"""
        arch = {
            "frontend": {},
            "backend": {},
            "database": {},
            "authentication": {},
            "email": {},
            "deployment": {}
        }
        
        # Analyze package.json for tech stack
        package_json = self.project_root / "package.json"
        if package_json.exists():
            try:
                with open(package_json) as f:
                    pkg = json.load(f)
                    deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
                    
                    # Frontend detection
                    if 'react' in deps:
                        arch["frontend"]["framework"] = f"React {deps['react']}"
                    if 'vite' in deps:
                        arch["frontend"]["bundler"] = f"Vite {deps['vite']}"
                    if 'react-router-dom' in deps:
                        arch["frontend"]["routing"] = f"React Router {deps['react-router-dom']}"
                    
                    # Backend detection
                    if 'express' in deps:
                        arch["backend"]["framework"] = f"Express {deps['express']}"
                    if 'knex' in deps:
                        arch["backend"]["query_builder"] = f"Knex {deps['knex']}"
                    if 'sqlite3' in deps:
                        arch["database"]["driver"] = f"sqlite3 {deps['sqlite3']}"
                    
                    # Authentication
                    if 'jsonwebtoken' in deps:
                        arch["authentication"]["tokens"] = f"JWT {deps['jsonwebtoken']}"
                    if 'bcryptjs' in deps:
                        arch["authentication"]["password_hashing"] = f"bcryptjs {deps['bcryptjs']}"
                    
                    # Email
                    if 'nodemailer' in deps:
                        arch["email"]["service"] = f"Nodemailer {deps['nodemailer']}"
                        
            except Exception as e:
                if self.verbose:
                    print(f"[arch] Package.json analysis failed: {e}")
        
        # Check for database config
        db_config = self.project_root / "backend" / "config" / "db.js"
        if db_config.exists():
            arch["database"]["config_file"] = "backend/config/db.js"
            try:
                with open(db_config) as f:
                    content = f.read()
                    if "knex" in content.lower():
                        arch["database"]["query_builder_confirmed"] = "Knex (detected in config)"
                    if "sqlite3" in content.lower():
                        arch["database"]["type"] = "SQLite"
            except:
                pass
        
        # Check for email templates
        templates_dir = self.project_root / "backend" / "templates"
        if templates_dir.exists():
            templates = list(templates_dir.glob("*.html"))
            arch["email"]["templates"] = [t.name for t in templates]
        
        # Check for authentication middleware
        auth_middleware = self.project_root / "backend" / "middleware" / "authMiddleware.js"
        if auth_middleware.exists():
            arch["authentication"]["middleware"] = "Custom JWT middleware"
        
        return arch

    # Git commit analysis for current status
    def get_recent_development_activity(self) -> Dict[str, Any]:
        """Get recent git activity to understand current development focus"""
        try:
            # Get last 10 commits
            result = subprocess.run(
                ['git', 'log', '--oneline', '-10'],
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=5
            )
            
            if result.returncode == 0:
                commits = result.stdout.strip().split('\n')
                return {
                    "recent_commits": commits,
                    "development_status": self.analyze_commit_patterns(commits)
                }
        except Exception as e:
            if self.verbose:
                print(f"[git] Could not get git history: {e}")
        
        return {"note": "Git history not available"}

    def analyze_commit_patterns(self, commits: List[str]) -> str:
        """Analyze commit messages to determine development focus"""
        commit_text = ' '.join(commits).lower()
        
        patterns = [
            ("email verification", ["email", "verify", "verification", "code"]),
            ("authentication", ["auth", "login", "register", "jwt", "token"]),
            ("database", ["database", "db", "schema", "migration"]),
            ("frontend styling", ["css", "style", "layout", "ui", "frontend"]),
            ("api development", ["api", "endpoint", "route", "controller"]),
            ("bug fixes", ["fix", "bug", "error", "issue"]),
        ]
        
        for status, keywords in patterns:
            if sum(1 for keyword in keywords if keyword in commit_text) >= 2:
                return status
        
        return "Active development"

    # Core documentation generation
    def generate_enhanced_documentation(self):
        """Generate comprehensive documentation with enhanced context"""
        
        # 1. Enhanced Project Overview
        overview = {
            "project": "NC Bourbon Tracker",
            "generated": self.timestamp,
            "description": "Web application for tracking bourbon inventory across NC ABC stores",
            "architecture": self.detect_project_architecture(),
            "recent_activity": self.get_recent_development_activity(),
            "key_files": sorted(list(self.critical_full_source)),
            "database_locations": {
                "user_auth": "backend/data/database.sqlite3",
                "inventory_dev": "BourbonDatabase/inventory.db", 
                "inventory_prod": "/opt/BourbonDatabase/inventory.db"
            }
        }
        self._write_json(self.output_dir / "project-overview.json", overview)

        # 2. Enhanced Database Schema with both databases
        db_schemas = self.extract_sqlite_schemas()
        if not db_schemas:
            db_schemas = {"note": "No SQLite databases found or accessible"}
        self._write_json(self.output_dir / "database-schema.json", db_schemas)

        # 3. Backend Core
        backend_files = self.collect_files_by_pattern([
            "backend/server.js", "backend/config/**/*.js", "backend/config/**/*.ts",
            "backend/routes/**/*.js", "backend/routes/**/*.ts",
            "backend/controllers/**/*.js", "backend/controllers/**/*.ts",
            "backend/middleware/**/*.js", "backend/middleware/**/*.ts",
            "backend/services/**/*.js", "backend/services/**/*.ts",
        ])
        backend_doc = self.create_source_chunk("Backend Core", backend_files) if backend_files else "# Backend Core\n\n_No matching files found._\n"
        self._write_text(self.output_dir / "backend-core.md", backend_doc)

        # 4. Frontend Core  
        frontend_files = self.collect_files_by_pattern([
            "frontend/src/App.jsx", "frontend/src/main.jsx", "frontend/src/App.tsx", "frontend/src/main.tsx",
            "frontend/src/contexts/**/*.jsx", "frontend/src/contexts/**/*.tsx",
            "frontend/src/contexts/**/*.js", "frontend/src/contexts/**/*.ts",
        ])
        frontend_doc = self.create_source_chunk("Frontend Core", frontend_files) if frontend_files else "# Frontend Core\n\n_No matching files found._\n"
        self._write_text(self.output_dir / "frontend-core.md", frontend_doc)

        # 5. API Reference
        api_routes = self.extract_all_routes()
        self._write_json(self.output_dir / "api-reference.json", api_routes)

        # 6. Email Templates and Configuration
        email_files = self.collect_files_by_pattern([
            "backend/templates/**/*.html",
            "backend/services/emailService.js",
            "backend/services/emailService.ts",
        ])
        if email_files:
            email_doc = self.create_source_chunk("Email System", email_files)
            self._write_text(self.output_dir / "email-system.md", email_doc)

        # 7. Environment and Configuration
        config_data = self.extract_configuration_info()
        self._write_json(self.output_dir / "configuration.json", config_data)

        print("✅ Enhanced documentation generated:")
        outputs = [
            "project-overview.json", "database-schema.json", "backend-core.md", 
            "frontend-core.md", "api-reference.json", "configuration.json"
        ]
        if email_files:
            outputs.append("email-system.md")
            
        for name in outputs:
            file_path = self.output_dir / name
            if file_path.exists():
                size = file_path.stat().st_size
                print(f"   • {name} ({size:,} bytes)")

        print(f"\n💡 For AI context: Start with project-overview.json, then use the most relevant chunks based on your task.")

    def extract_configuration_info(self) -> Dict[str, Any]:
        """Extract configuration and environment information"""
        config = {
            "environment_variables": {},
            "configuration_files": [],
            "deployment_info": {}
        }
        
        # Check for .env files
        for env_file in ['.env.example', '.env', '.env.local', '.env.production']:
            env_path = self.project_root / env_file
            if env_path.exists():
                try:
                    content = self.read_file_safely(env_path)
                    parsed = json.loads(self.summarize_env_file(content))
                    config["environment_variables"][env_file] = parsed
                except:
                    pass
        
        # Check for config files
        config_patterns = [
            "backend/config/**/*.js", "backend/config/**/*.json",
            "frontend/vite.config.js", "frontend/src/config/**/*.js"
        ]
        
        config_files = self.collect_files_by_pattern(config_patterns)
        config["configuration_files"] = [f["path"] for f in config_files]
        
        return config

    def extract_all_routes(self) -> List[Dict[str, str]]:
        """Enhanced route extraction from all backend route files"""
        routes = []
        routes_dir = self.project_root / 'backend' / 'routes'
        
        if not routes_dir.exists():
            return routes

        route_files = list(routes_dir.rglob("*.js")) + list(routes_dir.rglob("*.ts"))
        
        for route_file in route_files:
            try:
                content = self.read_file_safely(route_file)
                file_routes = self.extract_routes_from_content(content)
                
                for route_def in file_routes:
                    # Parse route definition
                    match = re.match(r"router\.(\w+)\('([^']+)'", route_def)
                    if match:
                        method, path = match.groups()
                        routes.append({
                            "method": method.upper(),
                            "path": path,
                            "file": str(route_file.relative_to(self.project_root))
                        })
                        
            except Exception as e:
                if self.verbose:
                    print(f"[routes] Failed to parse {route_file}: {e}")
        
        return routes

    # Utility methods
    def collect_files_by_pattern(self, patterns: List[str]) -> List[Dict]:
        """Collect files matching patterns with enhanced filtering"""
        files = []
        seen_paths = set()
        
        for pattern in patterns:
            for file_path in self.project_root.rglob(pattern):
                if not file_path.is_file():
                    continue
                if any(part in self.exclude_dirs for part in file_path.parts):
                    continue
                
                rel_path = str(file_path.relative_to(self.project_root))
                if rel_path in seen_paths:
                    continue
                seen_paths.add(rel_path)
                
                if self.should_include_file(file_path):
                    try:
                        content = self.read_file_safely(file_path)
                        processed_content = self.process_file_content(file_path, content)
                        files.append({
                            "path": rel_path,
                            "content": processed_content,
                            "size": len(processed_content)
                        })
                        if self.verbose:
                            print(f"[add] {rel_path} ({len(processed_content)} chars)")
                    except Exception as e:
                        if self.verbose:
                            print(f"[error] Skipped {file_path}: {e}")
        return files

    def should_include_file(self, file_path: Path) -> bool:
        rel_path = str(file_path.relative_to(self.project_root))
        
        if file_path.name in self.skip_files:
            return False
        if rel_path in self.critical_full_source:
            return True
        if file_path.name in self.summarize_only:
            return True
        if file_path.suffix.lower() in self.important_extensions:
            return True
        return False

    def process_file_content(self, file_path: Path, content: str) -> str:
        rel_path = str(file_path.relative_to(self.project_root))
        
        if rel_path in self.critical_full_source:
            return content
        if file_path.name in self.summarize_only:
            return self.summarize_only[file_path.name](content)
        
        extension = file_path.suffix.lower()
        if extension in self.filter_content:
            return self.filter_content[extension](content, rel_path)
        
        if len(content) > 2000:
            return f"{content[:2000]}\n\n// [File truncated - {len(content)} total chars]"
        return content

    def create_source_chunk(self, title: str, files: List[Dict]) -> str:
        md = f"# {title}\n\n**Generated:** {self.timestamp}\n\n"
        total_size = sum(f['size'] for f in files)
        md += f"**Files:** {len(files)} | **Total Size:** {total_size:,} chars\n\n"

        for file_info in files:
            md += f"## {file_info['path']}\n\n"
            ext = Path(file_info['path']).suffix.lower()
            lang = self.lang_map.get(ext, 'text')
            md += f"```{lang}\n{file_info['content']}\n```\n\n"
        return md

    def read_file_safely(self, file_path: Path) -> str:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()

    def _write_json(self, path: Path, obj):
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(obj, f, indent=2)

    def _write_text(self, path: Path, text: str):
        with open(path, 'w', encoding='utf-8') as f:
            f.write(text)


def parse_args():
    parser = argparse.ArgumentParser(description="Generate enhanced documentation for NC Bourbon Tracker")
    parser.add_argument("--project-root", "-p", type=str, default=".", 
                        help="Path to project root (default: current directory)")
    parser.add_argument("--verbose", "-v", action="store_true", 
                        help="Print detailed processing information")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    documenter = EnhancedBourbonTrackerDocumenter(project_root=args.project_root, verbose=args.verbose)
    documenter.generate_enhanced_documentation()