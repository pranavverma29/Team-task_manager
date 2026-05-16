import datetime
from app.database import SessionLocal, engine, Base
from app.models import User, Project, ProjectMember, Task, RoleEnum, StatusEnum, PriorityEnum
from app.security import hash_password

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Create a default user if none exists
        user = db.query(User).filter(User.email == "admin@example.com").first()
        if not user:
            print("Creating default user: admin@example.com / password123")
            user = User(
                name="Pranav",
                email="admin@example.com",
                hashed_password=hash_password("password123"),
                role=RoleEnum.ADMIN
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            print(f"User already exists: {user.email}")

        # 2. Create Example Projects
        project_data = [
            {
                "name": "🚀 Next-Gen Platform",
                "description": "Building the foundation for our upcoming scale-up. Focuses on performance, security, and developer experience."
            },
            {
                "name": "🎨 UI/UX Revamp",
                "description": "Modernizing our interface with glassmorphism, fluid animations, and a focus on accessibility."
            },
            {
                "name": "📊 Analytics Dashboard",
                "description": "Implementing real-time data visualization and predictive insights for stakeholders."
            }
        ]

        projects = []
        for p_data in project_data:
            p = db.query(Project).filter(Project.name == p_data["name"]).first()
            if not p:
                print(f"Creating project: {p_data['name']}")
                p = Project(
                    name=p_data["name"],
                    description=p_data["description"],
                    owner_id=user.id
                )
                db.add(p)
                db.commit()
                db.refresh(p)
                
                # Add owner as ADMIN member
                member = ProjectMember(project_id=p.id, user_id=user.id, role=RoleEnum.ADMIN)
                db.add(member)
                db.commit()
            projects.append(p)

        # 3. Create Example Tasks
        task_templates = [
            ("Infrastructure Setup", "Set up Kubernetes cluster and CI/CD pipelines.", StatusEnum.DONE, PriorityEnum.HIGH, -5),
            ("Database Migration", "Migrate legacy data to the new schema.", StatusEnum.IN_PROGRESS, PriorityEnum.HIGH, 2),
            ("API Documentation", "Write comprehensive Swagger docs for the new endpoints.", StatusEnum.TODO, PriorityEnum.MEDIUM, 7),
            ("Design System", "Create a reusable component library in Figma.", StatusEnum.DONE, PriorityEnum.MEDIUM, -10),
            ("Implement Charts", "Add Chart.js integration for the dashboard.", StatusEnum.IN_PROGRESS, PriorityEnum.HIGH, 1),
            ("User Feedback Loop", "Set up Hotjar and gather initial user sentiments.", StatusEnum.TODO, PriorityEnum.LOW, 14),
            ("Bug: Login Lag", "Investigate and fix the 2s delay on login.", StatusEnum.TODO, PriorityEnum.HIGH, 0),
            ("Marketing Landing Page", "Design and build the new product landing page.", StatusEnum.IN_PROGRESS, PriorityEnum.MEDIUM, 5),
            ("Security Audit", "Perform a full penetration test on the staging environment.", StatusEnum.TODO, PriorityEnum.HIGH, 10),
            ("Refactor Auth Flow", "Clean up the login/signup logic in the frontend.", StatusEnum.TODO, PriorityEnum.MEDIUM, 3)
        ]

        for i, (title, desc, status, priority, due_offset) in enumerate(task_templates):
            # Distribute tasks across projects
            project = projects[i % len(projects)]
            
            existing_task = db.query(Task).filter(Task.title == title, Task.project_id == project.id).first()
            if not existing_task:
                print(f"Creating task: {title} in {project.name}")
                due_date = datetime.date.today() + datetime.timedelta(days=due_offset)
                task = Task(
                    title=title,
                    description=desc,
                    project_id=project.id,
                    assignee_id=user.id,
                    status=status,
                    priority=priority,
                    due_date=due_date
                )
                db.add(task)
        
        db.commit()
        print("\n✅ Seeding completed successfully!")
        print(f"Login with: admin@example.com / password123")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed()
