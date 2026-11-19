<script setup lang="ts">
import AppDialog from "./AppDialog.vue";
import {
  confirmation,
  confirmationOpen,
  confirmationClosed,
  respondToConfirmation,
} from "../lib/confirmation";
</script>

<template>
  <AppDialog
    id="confirm-dialog"
    role="alertdialog"
    :aria-label="confirmation?.title"
    :open="confirmationOpen"
    @closed="confirmationClosed"
  >
    <div slot="headline">{{ confirmation?.title }}</div>
    <p slot="content">{{ confirmation?.message }}</p>
    <div slot="actions">
      <md-text-button @click="respondToConfirmation()">取消</md-text-button>
      <md-text-button
        :class="{ 'danger-button': confirmation?.danger }"
        @click="respondToConfirmation(true)"
        >{{ confirmation?.action }}</md-text-button
      >
    </div>
  </AppDialog>
</template>
