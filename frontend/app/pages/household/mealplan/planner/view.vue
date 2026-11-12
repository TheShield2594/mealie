<template>
  <div>
    <GroupMealPlanEntryDialog
      v-model="dialog.open"
      :entry="dialog.entry"
      :date="dialog.date"
      @create="actions.createOne($event)"
      @update="actions.updateOne($event)"
    />
    <!-- Until the week has loaded: a placeholder week of its own. It is swapped for the real days
         rather than growing into them, so nothing on screen shifts when the meals arrive -->
    <div
      v-if="loading"
      class="plan-skeleton"
      aria-busy="true"
      :aria-label="$t('empty-state.loading')"
    >
      <div v-for="n in 4" :key="n" class="plan-skeleton__day mealie-card">
        <BaseSkeleton :width="70" :height="11" />
        <BaseSkeleton class="mt-2" :width="130" :height="17" />
        <BaseSkeleton class="mt-6" :width="64" :height="10" />
        <div class="plan-skeleton__entry">
          <BaseSkeleton :width="72" :height="72" radius="sm" />
          <div class="plan-skeleton__text">
            <BaseSkeleton width="75%" :height="14" />
            <BaseSkeleton class="mt-2" width="40%" :height="12" />
          </div>
        </div>
      </div>
    </div>
    <MealPlanLayout v-else :mealplans="mealplans">
      <template #default="{ day }">
        <MealPlanDay :day="day.date" :actions="actions" :recipes="day.recipes">
          <SpinTransition>
            <div v-if="day.sections.length" class="plan-day-meals" :class="{ 'plan-day-meals--week': weekColumns }">
              <SpinTransition>
                <div v-for="section in day.sections" :key="section.title">
                  <div class="plan-section">
                    {{ section.title }}
                  </div>
                  <SpinTransition>
                    <div
                      v-for="mealplan in section.meals"
                      :key="mealplan.id"
                      class="mb-2"
                    >
                      <RecipeCardMobile
                        :recipe-id="mealplan.recipe ? mealplan.recipe.id! : ''"
                        :scale="mealplan.recipeScale ?? 1"
                        :rating="mealplan.recipe ? mealplan.recipe.rating! : 0"
                        :slug="mealplan.recipe ? mealplan.recipe.slug! : mealplan.title!"
                        :description="mealplan.recipe ? mealplan.recipe.description! : mealplan.text!"
                        :name="mealplan.recipe ? mealplan.recipe.name! : mealplan.title!"
                        :image="mealplan.recipe ? mealplan.recipe.image! : undefined"
                        :tags="mealplan.recipe ? mealplan.recipe.tags! : []"
                        :meta="mealplan.recipe"
                        :vertical="weekColumns"
                        hide-favorite
                        :context-menu-leading-items="[
                          {
                            title: $t('meal-plan.remove-from-plan'),
                            icon: $globals.icons.calendarRemove,
                            color: undefined,
                            event: 'mealplanRemove',
                            isPublic: false,
                          },
                          {
                            title: $t('meal-plan.edit-meal-plan'),
                            icon: $globals.icons.calendarEdit,
                            color: undefined,
                            event: 'mealplanEdit',
                            isPublic: false,
                          },
                        ]"
                        @mealplan-remove="removeMeal(mealplan)"
                        @mealplan-edit="editMeal(mealplan)"
                      >
                        <template v-if="!mealplan.recipe" #context-menu>
                          <MealPlanNoteMenu
                            @mealplan-remove="removeMeal(mealplan)"
                            @mealplan-edit="editMeal(mealplan)"
                          />
                        </template>
                      </RecipeCardMobile>
                      <div v-if="mealplan.recipe" class="d-flex justify-end pt-1">
                        <MealPlanScaleControl :meal="mealplan" :actions="actions" />
                      </div>
                    </div>
                  </SpinTransition>
                </div>
              </SpinTransition>
            </div>
            <div v-else class="plan-day-empty">
              {{ $t("recipe-library.nothing-planned") }}
            </div>
          </SpinTransition>
        </MealPlanDay>
      </template>
    </MealPlanLayout>
  </div>
</template>

<script setup lang="ts">
import MealPlanNoteMenu from "~/components/Domain/Mealplan/MealPlanNoteMenu.vue";
import MealPlanScaleControl from "~/components/Domain/Mealplan/MealPlanScaleControl.vue";
import RecipeCardMobile from "~/components/Domain/Recipe/RecipeCardMobile.vue";
import type { MealsByDate } from "~/composables/use-group-mealplan";
import { alert } from "~/composables/use-toast";
import { usePlannerWeekColumns } from "~/composables/use-planner-week-columns";
import type { ReadPlanEntry } from "~/lib/api/types/meal-plan";

const props = defineProps<{
  mealplans: MealsByDate[];
  loading?: boolean;
  actions: ReturnType<typeof useMealplans>["actions"];
}>();

const i18n = useI18n();
const weekColumns = usePlannerWeekColumns(() => props.mealplans.length);

const dialog = reactive({
  open: false,
  entry: null as ReadPlanEntry | null,
  date: null as Date | null,
});

// Removing an entry is one tap from its menu, so it can be taken back: the toast's Undo puts the
// same meal back on the same day (as a new entry)
async function removeMeal(mealplan: ReadPlanEntry) {
  await props.actions.deleteOne(mealplan.id);
  alert.info(i18n.t("toast.removed-from-plan", { name: mealplan.recipe?.name || mealplan.title }), null, {
    timeout: 6000,
    action: {
      message: i18n.t("general.undo"),
      onClick: () => {
        props.actions.createOne({
          date: mealplan.date,
          entryType: mealplan.entryType,
          title: mealplan.title,
          text: mealplan.text,
          recipeId: mealplan.recipeId,
          recipeScale: mealplan.recipeScale,
        });
      },
    },
  });
}

function editMeal(mealplan: ReadPlanEntry) {
  if (!mealplan.entryType) return;

  dialog.entry = mealplan;
  dialog.date = null;
  dialog.open = true;
}
</script>

<style scoped>
.plan-day-meals {
  margin-top: 4px;
}

/* In a week column the servings pill stays (it opens its own editor) and the -/+ steppers
   beside it step aside: there isn't room for both in a ~130px column */
.plan-day-meals--week :deep(.v-item-group) {
  display: none;
}

.plan-day-meals--week :deep(.mealie-row-card--vertical) {
  padding: 6px;
  gap: 8px;
}

.plan-day-meals--week :deep(.mealie-row-card__title) {
  font-size: var(--mealie-text-meta);
}

.plan-day-meals--week :deep(.mealie-row-card__meta) {
  font-size: 12px;
}

.plan-section {
  padding: 12px 2px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--mealie-text-tertiary);
}

.plan-day-empty {
  padding: 18px 2px 8px;
  font-size: 14px;
  color: var(--mealie-text-tertiary);
}

/* mirrors MealPlanLayout's grid and day cards */
.plan-skeleton {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(356px, 1fr));
  gap: 20px;
  align-items: start;
}

.plan-skeleton__day {
  padding: 18px;
}

.plan-skeleton__entry {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 10px;
  padding: 8px;
  border-radius: var(--mealie-radius-md);
  box-shadow: inset 0 0 0 1px var(--mealie-hairline);
}

.plan-skeleton__text {
  flex: 1;
}

@media (max-width: 600px) {
  .plan-skeleton {
    grid-template-columns: minmax(0, 1fr);
  }

  .plan-skeleton__day {
    padding: 16px 12px 12px;
  }
}
</style>
