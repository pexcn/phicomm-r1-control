import { onBeforeUnmount, shallowRef } from "vue";

type Confirmation = {
  title: string;
  message: string;
  action: string;
  danger?: boolean;
};
type Request = Confirmation & { owner: symbol; resolve: (accepted: boolean) => void };

export const confirmation = shallowRef<Request | null>(null);
export const confirmationOpen = shallowRef(false);
let accepted = false;

export function respondToConfirmation(value = false) {
  if (!confirmation.value) return;
  accepted = value;
  confirmationOpen.value = false;
}

// Resolve after the closing animation, before a follow-up operation opens a dialog.
export function confirmationClosed() {
  const request = confirmation.value;
  confirmationOpen.value = false;
  confirmation.value = null;
  request?.resolve(accepted);
  accepted = false;
}

export function useConfirmation() {
  const owner = Symbol("confirmation-owner");
  onBeforeUnmount(() => {
    if (confirmation.value?.owner === owner) respondToConfirmation();
  });
  return (options: Confirmation): Promise<boolean> => {
    if (confirmation.value) return Promise.resolve(false);
    accepted = false;
    return new Promise((resolve) => {
      confirmation.value = { ...options, owner, resolve };
      confirmationOpen.value = true;
    });
  };
}
