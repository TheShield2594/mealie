<template>
  <!-- A quiet thread under the recipe: a heading like the page's others, a composer, then each
       comment as avatar, name and date, and text. No cards around comments, no red buttons at rest -->
  <section class="recipe-comments">
    <h2 class="recipe-comments__title">
      {{ $t("recipe.comments") }}
      <span v-if="recipe.comments.length" class="recipe-comments__count">{{ recipe.comments.length }}</span>
    </h2>

    <div v-if="user.id" class="recipe-comments__composer">
      <UserAvatar
        :tooltip="false"
        size="32"
        :user-id="user.id"
      />
      <div class="recipe-comments__field">
        <v-textarea
          v-model="comment"
          hide-details
          density="compact"
          single-line
          variant="filled"
          auto-grow
          rows="2"
          :placeholder="$t('recipe.join-the-conversation')"
          :aria-label="$t('recipe.join-the-conversation')"
        />
        <div class="recipe-comments__post">
          <button
            type="button"
            class="mealie-pill mealie-pill--sm mealie-pill--primary"
            :disabled="!comment.trim()"
            @click="submitComment"
          >
            {{ $t("general.submit") }}
          </button>
        </div>
      </div>
    </div>

    <ol class="recipe-comments__list">
      <li
        v-for="recipeComment in recipe.comments"
        :key="recipeComment.id"
        class="recipe-comment"
      >
        <UserAvatar
          :tooltip="false"
          size="32"
          :user-id="recipeComment.userId"
        />
        <div class="recipe-comment__body">
          <div class="recipe-comment__meta">
            <span class="recipe-comment__name">{{ recipeComment.user.fullName }}</span>
            <span class="recipe-comment__date">{{ $d(Date.parse(recipeComment.createdAt), "medium") }}</span>
            <button
              v-if="user.id == recipeComment.user.id || user.admin"
              type="button"
              class="recipe-comment__delete"
              @click="deleteComment(recipeComment.id)"
            >
              {{ $t("general.delete") }}
            </button>
          </div>
          <SafeMarkdown class="recipe-comment__text" :source="recipeComment.text" />
        </div>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { useUserApi } from "~/composables/api";
import type { Recipe } from "~/lib/api/types/recipe";
import UserAvatar from "~/components/Domain/User/UserAvatar.vue";
import type { NoUndefinedField } from "~/lib/api/types/non-generated";
import { usePageUser } from "~/composables/recipe-page/shared-state";
import SafeMarkdown from "~/components/global/SafeMarkdown.vue";

const recipe = defineModel<NoUndefinedField<Recipe>>({ required: true });
const api = useUserApi();
const { user } = usePageUser();
const comment = ref("");

async function submitComment() {
  const text = comment.value.trim();
  if (!text) {
    return;
  }
  const { data } = await api.recipes.comments.createOne({
    recipeId: recipe.value.id,
    text,
  });

  if (data) {
    recipe.value.comments.push(data);
  }

  comment.value = "";
}

async function deleteComment(id: string) {
  const { response } = await api.recipes.comments.deleteOne(id);

  if (response?.status === 200) {
    recipe.value.comments = recipe.value.comments.filter(comment => comment.id !== id);
  }
}
</script>

<style scoped>
.recipe-comments {
  max-width: 760px;
  margin-top: var(--mealie-space-7);
}

.recipe-comments__title {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--mealie-hairline);
  font-size: var(--mealie-text-h3);
  font-weight: var(--mealie-weight-heading);
  letter-spacing: -0.01em;
}

.recipe-comments__count {
  font-size: var(--mealie-text-body);
  font-weight: 500;
  color: var(--mealie-ink-3);
}

.recipe-comments__composer {
  display: flex;
  gap: 12px;
  margin-top: var(--mealie-space-5);
}

.recipe-comments__field {
  flex: 1;
  min-width: 0;
}

.recipe-comments__post {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.recipe-comments__list {
  margin: var(--mealie-space-4) 0 0;
  padding: 0;
  list-style: none;
}

.recipe-comment {
  display: flex;
  gap: 12px;
  padding: var(--mealie-space-4) 0;
  border-bottom: 1px solid var(--mealie-hairline);
}

.recipe-comment:last-child {
  border-bottom: 0;
}

.recipe-comment__body {
  flex: 1;
  min-width: 0;
}

.recipe-comment__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 10px;
}

.recipe-comment__name {
  font-size: var(--mealie-text-body);
  font-weight: var(--mealie-weight-strong);
}

.recipe-comment__date {
  font-size: var(--mealie-text-meta);
  color: var(--mealie-ink-3);
}

.recipe-comment__delete {
  margin-left: auto;
  padding: 2px 6px;
  border: 0;
  border-radius: var(--mealie-radius-xs);
  background: transparent;
  color: var(--mealie-ink-3);
  font: inherit;
  font-size: var(--mealie-text-meta);
  cursor: pointer;
}

.recipe-comment__delete:hover,
.recipe-comment__delete:focus-visible {
  color: rgb(var(--v-theme-error));
}

.recipe-comment__text {
  margin-top: 4px;
  font-size: var(--mealie-text-body);
  line-height: 1.55;
  overflow-wrap: anywhere;
}
</style>
