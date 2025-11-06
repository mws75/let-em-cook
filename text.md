```mermaid
flowchart LR
    step1[User inputs recipe]
    step2[Recipe is saved to RDS saved as JSON string]
    step3[User can select recipes into workspace]
    step4[User clicks generate grocery list]
    step5[JSON is sent to ChatGPT API]
    step6[Grocery list generated]:wq
    step7[Grocery list and nutirtion stats JSON is sent back to User]
    step8[JSON is validated or cleaned up]
    step9[Grocery List Formated for user to print]
    step10[nutrition facts populate the Dashboard]
```

