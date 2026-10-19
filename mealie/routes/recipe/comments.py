from mealie.routes._base import BaseUserController, controller
from mealie.routes._base.routers import UserAPIRouter
from mealie.schema.recipe.recipe import RecipeSummary
from mealie.schema.recipe.recipe_comments import RecipeCommentOut

router = UserAPIRouter()


@controller(router)
class RecipeCommentsController(BaseUserController):
    @router.get("/{slug}/comments", response_model=list[RecipeCommentOut])
    async def get_recipe_comments(self, slug: str):
        """Get all comments for a recipe"""
        # only the id is needed, so skip loading the full recipe
        recipe = self.repos.recipes.get_one(slug, override_schema=RecipeSummary)
        return self.repos.comments.multi_query({"recipe_id": recipe.id})
