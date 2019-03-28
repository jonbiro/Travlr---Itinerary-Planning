Rails.application.routes.draw do
  namespace :api do
    namespace :v1 do
      resources :users
      resources :places
      resources :trip_users
      resources :trips
      resources :cities
      resources :google, only: [:create]


      post "/login", to: "auth#create"
      get "/profile", to: "users#profile"
    end
  end
end
