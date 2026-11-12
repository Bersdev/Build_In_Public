# Reúne todos os modelos para o Alembic e os testes enxergarem as tabelas.
from app.core import rate_limit as rate_limit_models  # noqa: F401
from app.modules.activity import models as activity_models  # noqa: F401
from app.modules.auth import models as auth_models  # noqa: F401
from app.modules.catalog import models as catalog_models  # noqa: F401
from app.modules.gamification import models as gamification_models  # noqa: F401
from app.modules.goals import models as goals_models  # noqa: F401
from app.modules.journal import models as journal_models  # noqa: F401
from app.modules.learning import models as learning_models  # noqa: F401
from app.modules.projects import models as projects_models  # noqa: F401
from app.modules.study_sessions import models as study_sessions_models  # noqa: F401
from app.modules.tasks import models as tasks_models  # noqa: F401
