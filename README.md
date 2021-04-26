# Documentation

## Install

```bash
git clone git:github.com/GreatFix/rating-backend.git
```

```bash
npm install
```

## Stack

- Nodejs
- Express
- Sequelize
- Postgresql

## Used

- **easyvk** for send request to VK API
- **jwt** and **crypto** for authentication user

## Routes

- GET "auth"
- GET "/user"
- GET "/target"
- GET "/targets"
- GET "/recent/feedbacks"
- GET "/recent/comments"
- GET "/targets/top/:count"
- GET "/users/top/:count"
- GET "/feedback"
- GET "/comment"
- POST "/feedback"
- POST "/comment"
- PUT "/feedback"
- PUT "/comment"
- DELETE "/feedback"
- DELETE "/comment"

## Models

- User

  - id
  - countPositiveFeedbacks
  - countNegativeFeedbacks

- Target

  - id
  - type
  - countPositiveFeedbacks
  - countNegativeFeedbacks

- Feedback

  - id
  - content
  - conclusion
  - images
  - albumId

- Comment

  - id
  - content
  - images
  - greetingID
  - greetingName
