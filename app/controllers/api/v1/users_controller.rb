class Api::V1::UsersController < ApplicationController
  skip_before_action :authorized, only: [:create]

  def profile
    render json: { user: UserSerializer.new(current_user) }, status: :accepted
  end

  def index
    @users = User.all

    render json: @users
  end

  def show
    render json: current_user()
  end

  def create
    @user = User.new(user_params)
    @user.password = params[:password]
    if @user.save
      @token = encode_token(user_id: @user.id)
      render json: { user: UserSerializer.new(@user), jwt: @token }, status: :created
    else
      #   puts params[:password]
      render json: { error: "failed to create user" }, status: :not_acceptable
    end
  end

  def update
    if @user.update(user_params)
      render json: @user
    else
      render json: @user.errors, status: :unprocessable_entity
    end
  end

  def destroy
    @user.destroy
  end

  private

  def user_params
    params.require(:user).permit(:username, :password, :firstname, :lastname, :email, :avatar)
  end
end
